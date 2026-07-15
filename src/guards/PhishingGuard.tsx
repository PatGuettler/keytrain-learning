import { Navigate } from 'react-router-dom'
import { useRailnetAccess } from '@/hooks/useRailnetAccess'
import { ROLE_DASHBOARD } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'

export function PhishingGuard({ children }: { children: React.ReactNode }) {
  const { canAccessPhishing, isLoading } = useRailnetAccess()
  const role = useAuthStore((s) => s.profile?.role)

  if (isLoading) return null
  if (!canAccessPhishing) {
    const dest = role ? ROLE_DASHBOARD[role] : '/login'
    return <Navigate to={dest} replace />
  }
  return <>{children}</>
}
