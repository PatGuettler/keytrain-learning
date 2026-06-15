import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  firstNameFromFullName,
  isPhishingDryRun,
  replacePhishingPlaceholders,
  trackingBaseUrl,
} from '../_shared/phishing.ts'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')

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

    if (!testMode && campaign.status === 'sent') {
      return jsonResponse({ error: 'Campaign was already sent.' }, 400)
    }

    if (testMode && campaign.status === 'sent') {
      return jsonResponse({ error: 'Cannot test-send after the campaign has been sent to everyone.' }, 400)
    }

    if (testMode && recipientIds.length === 0) {
      return jsonResponse({ error: 'Select at least one recipient for a test send.' }, 400)
    }

    let recipientQuery = adminClient
      .from('phishing_recipients')
      .select('id, token, user_id')
      .eq('campaign_id', campaignId)

    if (testMode) {
      recipientQuery = recipientQuery.in('id', recipientIds)
    }

    const { data: recipients, error: recipientsError } = await recipientQuery

    if (recipientsError) throw recipientsError
    if (!recipients?.length) {
      return jsonResponse({ error: 'No recipients on this campaign. Save recipients first.' }, 400)
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
      if (!profile?.email) {
        failures.push({ email: recipient.user_id, error: 'Missing email' })
        continue
      }

      const trackingLink = `${trackBase}?token=${recipient.token}&event=click`
      const pixelUrl = campaign.track_opens
        ? `${trackBase}?token=${recipient.token}&event=open`
        : ''
      const trackParam = encodeURIComponent(trackBase)
      const loginBase = campaign.fake_login_url?.trim() || ''
      const loginUrl = loginBase
        ? `${loginBase}${loginBase.includes('?') ? '&' : '?'}token=${recipient.token}&track=${trackParam}`
        : trackingLink

      const ctx = {
        firstName: firstNameFromFullName(profile.full_name),
        fullName: profile.full_name,
        companyName: orgNameById.get(profile.org_id) ?? 'Your organization',
        managerName: profile.manager_id
          ? managerNameById.get(profile.manager_id) ?? 'Your manager'
          : 'Your manager',
        senderName: campaign.sender_name,
        deadlineDate: campaign.deadline_date ?? 'Friday',
        trackingLink,
        loginUrl,
        pixelUrl,
      }

      const html = replacePhishingPlaceholders(campaign.body_html, ctx)
      const text = replacePhishingPlaceholders(campaign.body_text || '', ctx)

      if (!dryRun) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${campaign.sender_name} <${campaign.sender_email}>`,
            to: [profile.email],
            subject: replacePhishingPlaceholders(campaign.subject, ctx),
            html,
            text: text || undefined,
          }),
        })

        if (!emailRes.ok) {
          const detail = await emailRes.text()
          failures.push({ email: profile.email, error: detail.slice(0, 200) })
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
      message: testMode
        ? dryRun
          ? `Test dry run: ${sentCount} recipient(s) marked as test-sent. No emails were delivered.`
          : `Test sent to ${sentCount} recipient(s). Campaign remains a draft — send to everyone when ready.`
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
