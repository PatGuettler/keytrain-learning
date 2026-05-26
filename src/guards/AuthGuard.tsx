import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.userId)
  const location = useLocation()
  if (!userId) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}
