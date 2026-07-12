import { useAuth } from './useAuth'
import type { UserRole } from '@/types/user.types'

export function useRole() {
  const { role, profile } = useAuth()
  const hasRole = (...roles: UserRole[]) => role !== undefined && roles.includes(role)
  return { role, profile, hasRole, isAdmin: role === 'admin', isOrgAdmin: role === 'org_admin', isManager: role === 'manager', isEmployee: role === 'employee' }
}
