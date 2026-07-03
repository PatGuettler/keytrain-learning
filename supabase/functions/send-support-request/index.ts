import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, corsHeadersForRequest } from '../_shared/cors.ts'

const DEFAULT_TO = 'patguettler@gmail.com'
const DEFAULT_FROM = 'KeyTrain Learning Support <onboarding@resend.dev>'

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug report',
  feature: 'Feature request',
  training_request: 'Request training',
  question: 'General question',
  other: 'Other',
}

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

let requestCors: Record<string, string> = corsHeaders

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...requestCors, 'Content-Type': 'application/json' },
  })
}

function parseResendError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string }
    return parsed.message ?? body
  } catch {
    return body
  }
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
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const toEmail = Deno.env.get('SUPPORT_TO_EMAIL') ?? DEFAULT_TO
    const fromEmail = Deno.env.get('RESEND_FROM') ?? DEFAULT_FROM

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

    const body = await req.json()
    const category = typeof body.category === 'string' ? body.category : 'other'
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const userSnapshot = body.user_snapshot ?? {}

    if (!subject || !message) {
      return jsonResponse({ error: 'Subject and message are required.' }, 400)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error: insertError } = await adminClient.from('support_requests').insert({
      user_id: user.id,
      category,
      subject,
      message,
      user_snapshot: userSnapshot,
    })
    if (insertError) {
      console.error('support_requests insert error:', insertError)
      return jsonResponse({ error: insertError.message }, 500)
    }

    const emailBody = [
      `Category: ${categoryLabel(category)}`,
      `Subject: ${subject}`,
      '',
      message,
      '',
      '--- User profile ---',
      JSON.stringify(userSnapshot, null, 2),
    ].join('\n')

    if (!resendKey) {
      console.log('Support request saved (RESEND_API_KEY not set):', { toEmail, subject })
      return jsonResponse({
        saved: true,
        email_sent: false,
        message:
          'Your message was saved, but email is not configured on the server yet (RESEND_API_KEY missing).',
      })
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `[KeyTrain Learning — ${categoryLabel(category)}] ${subject}`,
        text: emailBody,
      }),
    })

    const resendBody = await emailRes.text()
    if (!emailRes.ok) {
      const detail = parseResendError(resendBody)
      console.error('Resend error:', emailRes.status, detail)
      return jsonResponse(
        {
          saved: true,
          email_sent: false,
          error: `Your message was saved, but email delivery failed: ${detail}`,
          resend_status: emailRes.status,
        },
        502
      )
    }

    console.log('Support email sent:', { toEmail, subject, resendBody })
    return jsonResponse({
      saved: true,
      email_sent: true,
      message: 'Your message was sent. Thank you!',
    })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Request failed.' }, 500)
  }
})
