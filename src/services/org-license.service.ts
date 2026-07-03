import type { Profile } from '@/types/user.types'

/** KeyTrain Learning staff admin — full app access, not an organization member role. */
export function isKtlAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === 'admin'
}

/** @deprecated Use isKtlAdmin — kept for call sites that mean platform staff admin. */
export function isPlatformAdmin(profile: Profile | null | undefined): boolean {
  return isKtlAdmin(profile)
}

/** KTL admins always; org managers/employees only when granted on their profile. */
export function canAccessRailnet(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  if (isKtlAdmin(profile)) return true
  return profile.railnet_enabled === true
}
