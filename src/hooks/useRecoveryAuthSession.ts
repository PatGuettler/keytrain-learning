import { useEffect, useState } from 'react'
import { getAuthCallbackSignals } from '@/lib/auth-callback'
import { getSession, recoverSessionFromUrl, signOut } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

const MAX_ATTEMPTS = 24
const RETRY_MS = 300

/** Clear stale app auth and wait for Supabase to establish a recovery/invite session from the URL. */
export function useRecoveryAuthSession() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    const { hasTokens, hasError } = getAuthCallbackSignals()

    const prepare = async () => {
      clearAuth()

      if (hasError) {
        if (!cancelled) setChecking(false)
        return
      }

      // Never sign out while recovery/invite tokens are in the URL — that destroys the email session.
      if (!hasTokens) {
        await signOut()
      }

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (cancelled) return

        try {
          const session = hasTokens ? await recoverSessionFromUrl() : await getSession()
          if (session) {
            setReady(true)
            setChecking(false)
            return
          }
        } catch (err) {
          console.error('Failed to establish recovery session:', err)
          if (!cancelled) setChecking(false)
          return
        }

        if (hasTokens) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_MS))
        } else {
          break
        }
      }

      if (!cancelled) setChecking(false)
    }

    void prepare()

    return () => {
      cancelled = true
    }
  }, [clearAuth])

  return { ready, checking }
}
