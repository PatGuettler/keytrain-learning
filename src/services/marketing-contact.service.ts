import { getSupabaseAnonKey, getSupabaseUrl } from '@/services/supabase'

type ContactResponse = {
  ok?: boolean
  error?: string
  message?: string
}

export async function submitMarketingContact(payload: {
  name: string
  email: string
  organization?: string
  message: string
  /** Honeypot — leave empty */
  website?: string
}) {
  const baseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!baseUrl || !anonKey) throw new Error('Backend is not configured.')

  const response = await fetch(`${baseUrl}/functions/v1/send-marketing-contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      name: payload.name.trim(),
      email: payload.email.trim(),
      organization: payload.organization?.trim() ?? '',
      message: payload.message.trim(),
      website: payload.website ?? '',
    }),
  })

  const data = (await response.json().catch(() => null)) as ContactResponse | null
  if (!response.ok) {
    throw new Error(data?.error ?? data?.message ?? 'Could not send your message.')
  }

  return {
    message: data?.message ?? 'Thanks — we received your message and will follow up soon.',
  }
}
