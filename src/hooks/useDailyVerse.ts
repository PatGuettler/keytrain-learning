import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  dismissDailyVerse,
  fetchDailyVerse,
  getLocalDateString,
  isDailyVerseDismissed,
} from '@/services/daily-verse.service'
import { useAuthStore } from '@/store/authStore'

export function useDailyVerse() {
  const userId = useAuthStore((s) => s.userId)
  const dailyVerseEnabled = useAuthStore((s) => s.profile?.daily_verse_enabled !== false)
  const queryClient = useQueryClient()
  const localDate = useMemo(() => getLocalDateString(), [])
  const [dismissedLocally, setDismissedLocally] = useState(false)

  const enabled = Boolean(userId && dailyVerseEnabled && !dismissedLocally)

  const { data: alreadyDismissed = false, isLoading: checkingDismissal } = useQuery({
    queryKey: ['daily-verse-dismissed', userId, localDate],
    queryFn: () => isDailyVerseDismissed(userId!, localDate),
    enabled: Boolean(userId && dailyVerseEnabled),
  })

  const shouldFetchVerse = enabled && !alreadyDismissed && !checkingDismissal

  const {
    data: verse,
    isLoading: loadingVerse,
    isError,
  } = useQuery({
    queryKey: ['daily-verse', localDate],
    queryFn: () => fetchDailyVerse(localDate),
    enabled: shouldFetchVerse,
    retry: false,
    staleTime: 24 * 60 * 60 * 1000,
  })

  const dismiss = useCallback(async () => {
    if (!userId) return
    setDismissedLocally(true)
    try {
      await dismissDailyVerse(userId, localDate)
      await queryClient.invalidateQueries({ queryKey: ['daily-verse-dismissed', userId, localDate] })
    } catch (err) {
      console.error('Failed to dismiss daily verse:', err)
    }
  }, [userId, localDate, queryClient])

  const showBanner = shouldFetchVerse && !loadingVerse && !isError && Boolean(verse)

  return {
    showBanner,
    verse,
    dismiss,
  }
}
