import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, corsHeadersForRequest } from '../_shared/cors.ts'
import { trainingPageUrl, isAllowedPhishingRedirect } from '../_shared/phishing.ts'

const TRANSPARENT_GIF = new Uint8Array([
  71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255, 33, 249, 4, 1, 0, 0, 1,
  0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59,
])

const ALLOWED_EVENTS = new Set(['open', 'click', 'credential_submission', 'training_viewed'])

async function resolveToken(
  req: Request,
  url: URL
): Promise<{ token: string | null; event: string }> {
  if (req.method === 'POST') {
    const form = await req.formData()
    return {
      token: String(form.get('token') ?? url.searchParams.get('token') ?? ''),
      event: String(form.get('event') ?? url.searchParams.get('event') ?? 'credential_submission'),
    }
  }
  return {
    token: url.searchParams.get('token'),
    event: url.searchParams.get('event') ?? 'click',
  }
}

Deno.serve(async (req) => {
  const cors = corsHeadersForRequest(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response('Server misconfigured', { status: 500, headers: cors })
    }

    const url = new URL(req.url)
    const { token, event: rawEvent } = await resolveToken(req, url)
    const event = ALLOWED_EVENTS.has(rawEvent) ? rawEvent : 'click'

    if (!token) {
      return Response.redirect(trainingPageUrl(), 302)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: recipient } = await adminClient
      .from('phishing_recipients')
      .select('id, campaign_id, user_id')
      .eq('token', token)
      .maybeSingle()

    if (recipient) {
      const { count } = await adminClient
        .from('phishing_events')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', recipient.id)
        .eq('event_type', event)

      if ((count ?? 0) === 0) {
        await adminClient.from('phishing_events').insert({
          campaign_id: recipient.campaign_id,
          recipient_id: recipient.id,
          user_id: recipient.user_id,
          event_type: event,
          ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip'),
          user_agent: req.headers.get('user-agent'),
        })
      }
    }

    if (event === 'open') {
      return new Response(TRANSPARENT_GIF, {
        headers: {
          ...cors,
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      })
    }

    if (event === 'click' && url.searchParams.get('beacon') === '1') {
      return new Response(TRANSPARENT_GIF, {
        headers: {
          ...cors,
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      })
    }

    if (event === 'click') {
      const next = url.searchParams.get('next')
      if (next && isAllowedPhishingRedirect(next)) {
        return Response.redirect(next, 302)
      }
    }

    const trainingUrl = `${trainingPageUrl()}?token=${encodeURIComponent(token)}`
    return Response.redirect(trainingUrl, 302)
  } catch (err) {
    console.error(err)
    return Response.redirect(trainingPageUrl(), 302)
  }
})
