import { PLATFORM_ORG_ID } from '@/lib/constants'
import type { Profile } from '@/types/user.types'

export function isPlatformAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === 'admin' && profile.org_id === PLATFORM_ORG_ID
}

/** Platform admins always; other users when an admin enabled RailNet on their profile. */
export function canAccessRailnet(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  if (isPlatformAdmin(profile)) return true
  return profile.railnet_enabled === true
}
