import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, corsHeadersForRequest } from '../_shared/cors.ts'
import {
  buildRecipientContext,
  isPhishingDryRun,
  parseResendError,
  replacePhishingPlaceholders,
  resolveCampaignSenderEmail,
  trackingBaseUrl,
} from '../_shared/phishing.ts'

let requestCors: Record<string, string> = corsHeaders

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...requestCors, 'Content-Type': 'application/json' },
  })
}

async function assertAdmin(
  adminClient: ReturnType<typeof createClient>,
  userId: string
) {
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  if (error || profile?.role !== 'admin') {
    throw new Error('Forbidden')
  }
}

async function resolveDeliveryEmail(
  adminClient: ReturnType<typeof createClient>,
  profile: { id: string; email: string | null }
): Promise<string | null> {
  const profileEmail = profile.email?.trim()
  if (profileEmail) return profileEmail

  const { data, error } = await adminClient.auth.admin.getUserById(profile.id)
  if (error || !data.user?.email?.trim()) return null
  return data.user.email.trim()
}

async function resolveUserIdByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()
  if (profileError) throw profileError
  if (profile?.id) return profile.id

  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (authError) return null
  const authUser = authData.users.find((user) => user.email?.trim().toLowerCase() === email)
  return authUser?.id ?? null
}

Deno.serve(async (req) => {
  requestCors = corsHeadersForRequest(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: requestCors })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')?.trim() ?? ''

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Server misconfigured.' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing authorization header.' }, 401)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'Unauthorized.' }, 401)

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    await assertAdmin(adminClient, user.id)

    const body = await req.json()
    const campaignId = typeof body.campaign_id === 'string' ? body.campaign_id : ''
    if (!campaignId) return jsonResponse({ error: 'campaign_id is required.' }, 400)

    const testMode = body.test_mode === true
    const testEmails = Array.isArray(body.test_emails)
      ? [
          ...new Set(
            body.test_emails
              .filter((e: unknown) => typeof e === 'string')
              .map((e: string) => e.trim().toLowerCase())
              .filter(Boolean)
          ),
        ]
      : []
    const recipientIds = Array.isArray(body.recipient_ids)
      ? body.recipient_ids.filter((id: unknown) => typeof id === 'string')
      : []

    const { data: campaign, error: campaignError } = await adminClient
      .from('phishing_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return jsonResponse({ error: 'Campaign not found.' }, 404)
    }

    let campaignOrgName: string | null = null
    if (campaign.org_id) {
      const { data: campaignOrg } = await adminClient
        .from('organizations')
        .select('name')
        .eq('id', campaign.org_id)
        .maybeSingle()
      campaignOrgName = campaignOrg?.name ?? null
    }

    if (!testMode && campaign.status === 'sent') {
      const { count: priorSentCount } = await adminClient
        .from('phishing_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .not('sent_at', 'is', null)

      if ((priorSentCount ?? 0) > 0) {
        return jsonResponse({ error: 'Campaign was already sent.' }, 400)
      }
    }

    if (testMode && campaign.status === 'sent') {
      return jsonResponse({ error: 'Cannot test-send after the campaign has been sent to everyone.' }, 400)
    }

    if (testMode && testEmails.length === 0 && recipientIds.length === 0) {
      return jsonResponse({ error: 'Add at least one email for a test send.' }, 400)
    }

    type RecipientRow = { id: string; token: string; user_id: string }
    let recipients: RecipientRow[] = []
    const unresolvedEmails: string[] = []

    if (testMode && testEmails.length > 0) {
      for (const email of testEmails) {
        const userId = await resolveUserIdByEmail(adminClient, email)
        if (!userId) {
          unresolvedEmails.push(email)
          continue
        }

        const { data: existing } = await adminClient
          .from('phishing_recipients')
          .select('id, token, user_id')
          .eq('campaign_id', campaignId)
          .eq('user_id', userId)
          .maybeSingle()

        if (existing) {
          recipients.push(existing)
          continue
        }

        const { data: inserted, error: insertError } = await adminClient
          .from('phishing_recipients')
          .insert({ campaign_id: campaignId, user_id: userId })
          .select('id, token, user_id')
          .single()

        if (insertError) throw insertError
        recipients.push(inserted)
      }

      if (unresolvedEmails.length > 0 && recipients.length === 0) {
        return jsonResponse(
          {
            error: `No app user found for: ${unresolvedEmails.join(', ')}. Test emails must match a user in KeyTrain Learning.`,
          },
          400
        )
      }
    } else {
      let recipientQuery = adminClient
        .from('phishing_recipients')
        .select('id, token, user_id')
        .eq('campaign_id', campaignId)

      if (testMode) {
        recipientQuery = recipientQuery.in('id', recipientIds)
      }

      const { data: loaded, error: recipientsError } = await recipientQuery
      if (recipientsError) throw recipientsError
      recipients = loaded ?? []
    }

    if (!recipients.length) {
      return jsonResponse(
        {
          error: testMode
            ? 'No test recipients could be resolved.'
            : 'No recipients on this campaign. Save recipients first.',
        },
        400
      )
    }

    const userIds = recipients.map((r) => r.user_id)
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, full_name, email, org_id, manager_id')
      .in('id', userIds)

    if (profilesError) throw profilesError

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))
    const orgIds = [...new Set((profiles ?? []).map((p) => p.org_id).filter(Boolean))]
    const { data: orgs } = await adminClient.from('organizations').select('id, name').in('id', orgIds)
    const orgNameById = new Map((orgs ?? []).map((o) => [o.id, o.name]))

    const managerIds = [...new Set((profiles ?? []).map((p) => p.manager_id).filter(Boolean))]
    const { data: managers } = managerIds.length
      ? await adminClient.from('profiles').select('id, full_name').in('id', managerIds)
      : { data: [] }
    const managerNameById = new Map((managers ?? []).map((m) => [m.id, m.full_name]))

    const trackBase = trackingBaseUrl(supabaseUrl)
    const dryRun = isPhishingDryRun()
    const now = new Date().toISOString()
    let sentCount = 0
    const failures: { email: string; error: string }[] = []

    for (const recipient of recipients) {
      const profile = profileById.get(recipient.user_id)
      if (!profile) {
        failures.push({ email: recipient.user_id, error: 'Missing profile' })
        continue
      }

      const deliveryEmail = await resolveDeliveryEmail(adminClient, profile)
      if (!deliveryEmail) {
        failures.push({ email: recipient.user_id, error: 'Missing email' })
        continue
      }

      const companyName =
        (profile.org_id ? orgNameById.get(profile.org_id) : null) ??
        campaignOrgName ??
        'Your Organization'

      const trackingLinkBase = `${trackBase}?token=${recipient.token}&event=click`
      const pixelUrl = campaign.track_opens
        ? `${trackBase}?token=${recipient.token}&event=open`
        : ''
      const trackParam = encodeURIComponent(trackBase)
      const loginBase = campaign.fake_login_url?.trim() || ''
      const fakeLoginPageUrl = loginBase
        ? `${loginBase}${loginBase.includes('?') ? '&' : '?'}token=${encodeURIComponent(recipient.token)}&track=${trackParam}&company=${encodeURIComponent(companyName)}`
        : ''
      const trackingLink = fakeLoginPageUrl
        ? `${trackingLinkBase}&next=${encodeURIComponent(fakeLoginPageUrl)}`
        : trackingLinkBase
      const loginUrl = trackingLink

      const ctx = buildRecipientContext({
        profile,
        orgNameById,
        managerNameById,
        campaignOrgName,
        campaignSenderName: campaign.sender_name,
        campaignSenderEmail: campaign.sender_email,
        deadlineDate: campaign.deadline_date ?? 'Friday',
        trackingLink,
        loginUrl,
        pixelUrl,
      })

      const html = replacePhishingPlaceholders(campaign.body_html, ctx)
      const text = replacePhishingPlaceholders(campaign.body_text || '', ctx)
      const fromName = ctx.senderName
      const fromEmail = resolveCampaignSenderEmail(campaign.sender_email, ctx)

      if (!dryRun) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [deliveryEmail],
            subject: replacePhishingPlaceholders(campaign.subject, ctx),
            html,
            text: text || undefined,
          }),
        })

        if (!emailRes.ok) {
          const detail = parseResendError(await emailRes.text())
          console.error('Resend error:', deliveryEmail, fromEmail, detail)
          failures.push({ email: deliveryEmail, error: detail.slice(0, 300) })
          continue
        }
      }

      await adminClient
        .from('phishing_recipients')
        .update(testMode ? { test_sent_at: now } : { sent_at: now })
        .eq('id', recipient.id)

      sentCount++
    }

    if (!testMode) {
      if (sentCount === 0) {
        const failureSummary = failures.map((f) => `${f.email}: ${f.error}`).join(' ')
        return jsonResponse(
          {
            success: false,
            dry_run: dryRun,
            email_sent: false,
            test_mode: false,
            sent_count: 0,
            failed_count: failures.length,
            failures,
            unresolved_emails: unresolvedEmails,
            error: dryRun
              ? 'Dry run only — set RESEND_API_KEY on Supabase and unset PHISHING_SIMULATION_DRY_RUN.'
              : failureSummary || 'No emails were delivered. Check recipient emails and Resend logs.',
            message: dryRun
              ? `Dry run: 0 emails delivered (RESEND_API_KEY missing or PHISHING_SIMULATION_DRY_RUN=true).`
              : `Sent 0 email(s). ${failureSummary || 'No recipients were emailed.'}`,
          },
          422
        )
      }

      await adminClient
        .from('phishing_campaigns')
        .update({ status: 'sent', sent_at: now, updated_at: now })
        .eq('id', campaignId)
    } else {
      await adminClient
        .from('phishing_campaigns')
        .update({ test_mode: true, updated_at: now })
        .eq('id', campaignId)
    }

    return jsonResponse({
      success: true,
      dry_run: dryRun,
      email_sent: !dryRun,
      test_mode: testMode,
      sent_count: sentCount,
      failed_count: failures.length,
      failures,
      unresolved_emails: unresolvedEmails,
      message: testMode
        ? dryRun
          ? `Test dry run: ${sentCount} recipient(s) marked as test-sent. No emails were delivered.${
              unresolvedEmails.length ? ` Skipped (no user): ${unresolvedEmails.join(', ')}.` : ''
            }`
          : `Test sent to ${sentCount} recipient(s). Campaign remains a draft — send to everyone when ready.${
              unresolvedEmails.length ? ` Skipped (no user): ${unresolvedEmails.join(', ')}.` : ''
            }`
        : dryRun
          ? `Dry run: ${sentCount} recipient(s) marked as sent. No emails were delivered (RESEND_API_KEY missing or PHISHING_SIMULATION_DRY_RUN=true).`
          : `Sent ${sentCount} email(s).`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed.'
    const status = message === 'Forbidden' ? 403 : 500
    console.error(err)
    return jsonResponse({ error: message }, status)
  }
})
