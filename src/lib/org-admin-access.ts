import type { OrganizationMembership } from '@/services/org-memberships.service'
import type { Profile } from '@/types/user.types'

/** Org IDs the signed-in user may manage as org_admin (membership + active profile org). */
export function orgAdminManagedOrgIds(
  profile: Profile | null | undefined,
  memberships: OrganizationMembership[]
): string[] {
  const ids = new Set<string>()
  for (const m of memberships) {
    if (m.role === 'org_admin') ids.add(m.org_id)
  }
  if (profile?.role === 'org_admin' && profile.org_id) {
    ids.add(profile.org_id)
  }
  return [...ids]
}

export function orgAdminManagesOrg(
  orgId: string,
  profile: Profile | null | undefined,
  memberships: OrganizationMembership[]
): boolean {
  return orgAdminManagedOrgIds(profile, memberships).includes(orgId)
}
