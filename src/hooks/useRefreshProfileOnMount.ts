import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { fetchProfile } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

/**
 * Re-load profile from the database when the app shell mounts so org moves
 * (and other admin edits) aren't stuck behind the persisted Zustand snapshot.
 */
export function useRefreshProfileOnMount() {
  const userId = useAuthStore((s) => s.userId)
  const email = useAuthStore((s) => s.email)
  const setAuth = useAuthStore((s) => s.setAuth)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId || !email) return
    let cancelled = false

    void fetchProfile(userId)
      .then((next) => {
        if (cancelled) return
        const prev = useAuthStore.getState().profile
        const orgChanged = prev?.org_id !== next.org_id
        setAuth({ userId, email, profile: next })
        if (orgChanged) {
          void queryClient.invalidateQueries({ queryKey: ['courses'] })
          void queryClient.invalidateQueries({ queryKey: ['assignments'] })
          void queryClient.invalidateQueries({ queryKey: ['course-notices'] })
        }
      })
      .catch(() => {
        /* keep persisted profile if refresh fails */
      })

    return () => {
      cancelled = true
    }
  }, [userId, email, setAuth, queryClient])
}
