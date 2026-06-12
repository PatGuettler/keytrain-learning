import { useEffect, useState } from 'react'
import { getSession, signOut } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

/** Clear stale app auth and wait for Supabase to establish a recovery/invite session from the URL hash. */
export function useRecoveryAuthSession() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    const prepare = async () => {
      clearAuth()
      await signOut()

      for (let attempt = 0; attempt < 8; attempt++) {
        const session = await getSession()
        if (cancelled) return
        if (session) {
          setReady(true)
          setChecking(false)
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 250))
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
