import { backend } from '@/backend'
import type { AdminProfileUpdate, Profile, UserPreferencesUpdate, UserRole } from '@/types/user.types'

export async function fetchProfiles(filters?: {
  orgId?: string
  managerId?: string
  role?: UserRole
  includeInactive?: boolean
  excludeAdmins?: boolean
}): Promise<Profile[]> {
  return backend.users.fetchProfiles(filters)
}

/** Hospital staff only (managers + employees), never platform admins. */
export async function fetchOrgMembers(orgId: string, includeInactive = false) {
  return fetchProfiles({ orgId, includeInactive, excludeAdmins: true })
}

export async function updateProfile(id: string, patch: AdminProfileUpdate | UserPreferencesUpdate) {
  return backend.users.updateProfile(id, patch)
}
