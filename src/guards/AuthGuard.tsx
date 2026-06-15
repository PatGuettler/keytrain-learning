import { useCallback } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { SESSION_IDLE_TIMEOUT_MESSAGE, SESSION_IDLE_TIMEOUT_MS } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.userId)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleIdle = useCallback(async () => {
    await logout()
    navigate('/login', {
      replace: true,
      state: { message: SESSION_IDLE_TIMEOUT_MESSAGE },
    })
  }, [logout, navigate])

  useIdleTimeout({
    enabled: Boolean(userId),
    timeoutMs: SESSION_IDLE_TIMEOUT_MS,
    onIdle: handleIdle,
  })

  if (!userId) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}
