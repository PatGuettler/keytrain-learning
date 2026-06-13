import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROLE_DASHBOARD } from '@/lib/constants'

const UPGRADE_PATH = '/update-password-required'

export function PasswordPolicyGuard({ children }: { children?: React.ReactNode }) {
  const profile = useAuthStore((s) => s.profile)
  const location = useLocation()
  const upgradeRequired = Boolean(profile?.password_upgrade_required)

  if (upgradeRequired && location.pathname !== UPGRADE_PATH) {
    return <Navigate to={UPGRADE_PATH} replace state={{ from: location.pathname }} />
  }

  if (!upgradeRequired && location.pathname === UPGRADE_PATH) {
    const dest = profile?.role ? ROLE_DASHBOARD[profile.role] : '/'
    return <Navigate to={dest} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
