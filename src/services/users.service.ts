import { backend } from '@/backend'
import type { Profile, UserRole } from '@/types/user.types'

export async function fetchProfiles(filters?: {
  orgId?: string
  managerId?: string
  role?: UserRole
}): Promise<Profile[]> {
  return backend.users.fetchProfiles(filters)
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>) {
  return backend.users.updateProfile(id, patch)
}
