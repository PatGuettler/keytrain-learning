import { fetchProfile } from '@/services/auth.service'
import type { Profile } from '@/types/user.types'

/** create_organization_as_org_admin already switches active org — refresh local auth state. */
export async function syncAuthAfterOrgCreate(
  userId: string,
  org: { id: string; name: string },
  profile: Profile | null | undefined
): Promise<Profile> {
  const refreshed = await fetchProfile(userId)
  if (refreshed) return refreshed
  return {
    ...(profile ?? ({} as Profile)),
    id: userId,
    org_id: org.id,
    role: 'org_admin',
  } as Profile
}
