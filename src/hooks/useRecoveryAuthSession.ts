import { useEffect, useState } from 'react'
import { getAuthCallbackSignals, isAuthCallbackRoute } from '@/lib/auth-callback'
import { getSession, recoverSessionFromUrl, signOut } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

const MAX_ATTEMPTS = 24
const RETRY_MS = 300

/** Clear stale app auth and wait for Supabase to establish a recovery/invite session from the URL. */
export function useRecoveryAuthSession() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const { hasTokens, hasError } = getAuthCallbackSignals()
    const onAuthCallback = isAuthCallbackRoute()
    const searchParams = new URLSearchParams(window.location.search)
    const pendingVerify = searchParams.has('token_hash') || searchParams.has('code')

    const prepare = async () => {
      clearAuth()

      if (hasError) {
        if (!cancelled) setChecking(false)
        return
      }

      // Drop any existing login before consuming invite/reset tokens (avoids updating the wrong account).
      if (pendingVerify) {
        await signOut()
      } else if (!hasTokens) {
        const existing = await getSession()
        if (!existing) {
          await signOut()
        }
      }

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (cancelled) return

        try {
          const session =
            hasTokens || onAuthCallback ? await recoverSessionFromUrl() : await getSession()
          if (session) {
            const user = (session as { user?: { email?: string } }).user
            setSessionEmail(user?.email ?? null)
            setReady(true)
            setChecking(false)
            return
          }
        } catch (err) {
          console.error('Failed to establish recovery session:', err)
          if (!cancelled) {
            setReady(false)
            setChecking(false)
          }
          return
        }

        if (hasTokens || onAuthCallback) {
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

  return { ready, checking, sessionEmail }
}
