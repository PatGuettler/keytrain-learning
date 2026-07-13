import { corsHeaders, corsHeadersForRequest } from '../_shared/cors.ts'

const DEFAULT_FROM = 'KeyTrain Learning <support@keytrainlearning.com>'
/** Server-side only — never expose these addresses in the public UI. */
const DEFAULT_TO = [
  'patguettlerkt@outlook.com',
  'austinhosekt@outlook.com',
  'austinryalskt@outlook.com',
]

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

function parseRecipients(raw: string | undefined): string[] {
  if (!raw?.trim()) return [...DEFAULT_TO]
  const list = raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return list.length > 0 ? list : [...DEFAULT_TO]
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('RESEND_FROM') ?? DEFAULT_FROM
    const toEmails = parseRecipients(
      Deno.env.get('CONTACT_TO_EMAIL') ?? Deno.env.get('SUPPORT_TO_EMAIL')
    )

    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const organization = typeof body.organization === 'string' ? body.organization.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    // Honeypot — bots fill this; humans never see it
    const website = typeof body.website === 'string' ? body.website.trim() : ''

    if (website) {
      return jsonResponse({ ok: true, message: 'Thanks — we will be in touch shortly.' })
    }

    if (!name || !email || !message) {
      return jsonResponse({ error: 'Name, email, and message are required.' }, 400)
    }
    if (!isValidEmail(email)) {
      return jsonResponse({ error: 'Please enter a valid email address.' }, 400)
    }
    if (message.length > 5000) {
      return jsonResponse({ error: 'Message is too long.' }, 400)
    }

    if (!resendKey) {
      console.error('CONTACT form: RESEND_API_KEY not set')
      return jsonResponse(
        { error: 'Contact email is not configured. Please try again later.' },
        503
      )
    }

    const subject = organization
      ? `KTL inquiry — ${organization}`
      : 'KeyTrain Learning inquiry'

    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      organization ? `Organization: ${organization}` : null,
      '',
      message,
    ]
      .filter((line) => line !== null)
      .join('\n')

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmails,
        reply_to: email,
        subject: `[KeyTrain Learning — Contact] ${subject}`,
        text,
      }),
    })

    const resendBody = await emailRes.text()
    if (!emailRes.ok) {
      const detail = parseResendError(resendBody)
      console.error('Resend contact error:', emailRes.status, detail)
      return jsonResponse(
        { error: 'Could not send your message right now. Please try again later.' },
        502
      )
    }

    console.log('Marketing contact email sent', { recipients: toEmails.length, subject })
    return jsonResponse({
      ok: true,
      message: 'Thanks — we received your message and will follow up soon.',
    })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Request failed.' }, 500)
  }
})
