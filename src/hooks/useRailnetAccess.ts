import { useQuery } from '@tanstack/react-query'
import { fetchOrganizationById } from '@/services/organizations.service'
import { canAccessRailnet, isPlatformAdmin } from '@/services/org-license.service'
import { useAuthStore } from '@/store/authStore'

export function useRailnetAccess() {
  const profile = useAuthStore((s) => s.profile)

  return {
    canAccessRailnet: canAccessRailnet(profile),
    isPlatformAdmin: isPlatformAdmin(profile),
    isLoading: false,
  }
}

export function useRailnetOrgScope() {
  const profile = useAuthStore((s) => s.profile)
  const platformAdmin = isPlatformAdmin(profile)

  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization', profile?.org_id, 'railnet-scope'],
    queryFn: () => fetchOrganizationById(profile!.org_id),
    enabled: Boolean(!platformAdmin && profile?.org_id),
    staleTime: 5 * 60_000,
  })

  const hiveOrgId = organization?.hive_org_id?.trim() || null

  return {
    platformAdmin,
    hiveOrgId,
    isConfigured: platformAdmin || Boolean(hiveOrgId),
    isLoading: !platformAdmin && Boolean(profile?.org_id) && isLoading,
  }
}
