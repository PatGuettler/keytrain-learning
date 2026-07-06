import { useQuery } from '@tanstack/react-query'
import { fetchOrganizationById } from '@/services/organizations.service'
import { canAccessRailnet, isKtlAdmin } from '@/services/org-license.service'
import { useAuthStore } from '@/store/authStore'

export function useRailnetAccess() {
  const profile = useAuthStore((s) => s.profile)

  return {
    canAccessRailnet: canAccessRailnet(profile),
    isKtlAdmin: isKtlAdmin(profile),
    /** @deprecated */ isPlatformAdmin: isKtlAdmin(profile),
    isLoading: false,
  }
}

export function useRailnetOrgScope() {
  const profile = useAuthStore((s) => s.profile)
  const ktlAdmin = isKtlAdmin(profile)

  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization', profile?.org_id, 'railnet-scope'],
    queryFn: () => fetchOrganizationById(profile!.org_id),
    enabled: Boolean(!ktlAdmin && profile?.org_id),
    staleTime: 5 * 60_000,
  })

  const railnetOrgId = organization?.railnet_org_id?.trim() || null

  return {
    ktlAdmin,
    platformAdmin: ktlAdmin,
    railnetOrgId,
    isConfigured: ktlAdmin || Boolean(railnetOrgId),
    isLoading: !ktlAdmin && Boolean(profile?.org_id) && isLoading,
  }
}
