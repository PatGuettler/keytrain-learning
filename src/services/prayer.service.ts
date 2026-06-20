import { getEdgeFunctionAccessToken } from '@/lib/edge-function-auth'
import { getSupabase, getSupabaseAnonKey, getSupabaseUrl } from '@/services/supabase'

type PrayerSubmitResponse = {
  error?: string
  message?: string
}

export async function submitPrayerRequest(message: string) {
  const supabase = getSupabase()
  const baseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!supabase || !baseUrl || !anonKey) throw new Error('Backend is not configured.')

  const accessToken = await getEdgeFunctionAccessToken()

  const response = await fetch(`${baseUrl}/functions/v1/submit-prayer-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ message: message.trim() }),
  })

  const data = (await response.json().catch(() => null)) as PrayerSubmitResponse | null
  if (!response.ok) {
    throw new Error(data?.error ?? data?.message ?? 'Could not submit prayer request.')
  }

  return {
    message:
      data?.message ??
      'Your prayer request has been submitted. Our team will lift you up in prayer.',
  }
}
