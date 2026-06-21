import { backend } from '@/backend'
import { lookupDailyVerse } from '@/lib/daily-verse'

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
  const { reference, text } = lookupDailyVerse(localDate)
  return { reference, text, localDate }
}

export async function updateDailyVerseEnabled(userId: string, enabled: boolean) {
  const { updateProfile } = await import('@/services/users.service')
  return updateProfile(userId, { daily_verse_enabled: enabled })
}
