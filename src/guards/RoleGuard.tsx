import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROLE_DASHBOARD } from '@/lib/constants'
import type { UserRole } from '@/types/user.types'

export function RoleGuard({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const role = useAuthStore((s) => s.profile?.role)
  if (!role || !roles.includes(role)) {
    const redirect = role ? ROLE_DASHBOARD[role] : '/login'
    return <Navigate to={redirect} replace />
  }
  return <>{children}</>
}
