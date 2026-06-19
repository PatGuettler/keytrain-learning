import { backend } from '@/backend'

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function isDailyVerseDismissed(userId: string, localDate: string) {
  return backend.spiritual.isDailyVerseDismissed(userId, localDate)
}

export async function dismissDailyVerse(userId: string, localDate: string) {
  return backend.spiritual.dismissDailyVerse(userId, localDate)
}

export type DailyVerseResponse = {
  reference: string
  text: string
  localDate: string
  error?: string
}

export async function fetchDailyVerse(localDate: string): Promise<DailyVerseResponse> {
  const { getSupabase, getSupabaseAnonKey, getSupabaseUrl } = await import('@/services/supabase')
  const supabase = getSupabase()
  const baseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!supabase || !baseUrl || !anonKey) throw new Error('Backend is not configured.')

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('You must be signed in.')

  const response = await fetch(`${baseUrl}/functions/v1/get-daily-verse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ local_date: localDate }),
  })

  const data = (await response.json().catch(() => null)) as DailyVerseResponse | null
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not load daily verse.')
  }
  if (!data?.text) throw new Error('Could not load daily verse.')
  return data
}

export async function updateDailyVerseEnabled(userId: string, enabled: boolean) {
  const { updateProfile } = await import('@/services/users.service')
  return updateProfile(userId, { daily_verse_enabled: enabled })
}
