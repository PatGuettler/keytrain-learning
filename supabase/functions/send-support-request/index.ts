import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const DEFAULT_TO = 'patguettlerpages@gmail.com'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

    const body = await req.json()
    const category = typeof body.category === 'string' ? body.category : 'other'
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const userSnapshot = body.user_snapshot ?? {}
    const toEmail = typeof body.to_email === 'string' ? body.to_email : DEFAULT_TO

    if (!subject || !message) {
      return jsonResponse({ error: 'Subject and message are required.' }, 400)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    await adminClient.from('support_requests').insert({
      user_id: user.id,
      category,
      subject,
      message,
      user_snapshot: userSnapshot,
    })

    const emailBody = [
      `Category: ${category}`,
      `Subject: ${subject}`,
      '',
      message,
      '',
      '--- User profile ---',
      JSON.stringify(userSnapshot, null, 2),
    ].join('\n')

    if (resendKey) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'GuardianMD Support <onboarding@resend.dev>',
          to: [toEmail],
          subject: `[GuardianMD ${category}] ${subject}`,
          text: emailBody,
        }),
      })
      if (!emailRes.ok) {
        const errText = await emailRes.text()
        console.error('Resend error:', errText)
      }
    } else {
      console.log('Support request (email not configured):', emailBody)
    }

    return jsonResponse({
      message: resendKey
        ? 'Your message was sent. Thank you!'
        : 'Your message was recorded. Email delivery is not configured on the server yet.',
    })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Request failed.' }, 500)
  }
})
