import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeadersForRequest } from '../_shared/cors.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  const cors = corsHeadersForRequest(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response('Server misconfigured', { status: 500, headers: cors })
    }

    const body = (await req.json()) as { email?: string }
    const email = String(body.email ?? '').trim().toLowerCase()
    if (!email || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('cf-connecting-ip') ??
      'unknown'

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const ipAllowed = await adminClient.rpc('hit_rate_limit', {
      p_bucket: `failed-login:ip:${ip}`,
      p_max_hits: 30,
      p_window_seconds: 900,
    })
    if (ipAllowed.error) throw ipAllowed.error
    if (ipAllowed.data === false) {
      return new Response(JSON.stringify({ ok: true, rate_limited: true }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const emailAllowed = await adminClient.rpc('hit_rate_limit', {
      p_bucket: `failed-login:email:${email}`,
      p_max_hits: 5,
      p_window_seconds: 900,
    })
    if (emailAllowed.error) throw emailAllowed.error
    if (emailAllowed.data === false) {
      return new Response(JSON.stringify({ ok: true, rate_limited: true }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { error } = await adminClient.rpc('record_failed_login', { p_email: email })
    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('record-failed-login:', err)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
