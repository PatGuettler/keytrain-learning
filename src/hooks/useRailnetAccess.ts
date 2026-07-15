import { useQuery } from '@tanstack/react-query'
import { fetchOrganizationById } from '@/services/organizations.service'
import {
  canAccessPhishing,
  canAccessRailnet,
  fetchOrgLicense,
  isKtlAdmin,
} from '@/services/org-license.service'
import { useAuthStore } from '@/store/authStore'

/** Org product entitlements for nav + feature gates (RailNet / phishing). */
export function useRailnetAccess() {
  const profile = useAuthStore((s) => s.profile)
  const ktlAdmin = isKtlAdmin(profile)

  const { data: license, isLoading } = useQuery({
    queryKey: ['org-license', profile?.org_id],
    queryFn: () => fetchOrgLicense(profile!.org_id),
    enabled: Boolean(!ktlAdmin && profile?.org_id),
    staleTime: 30_000,
  })

  return {
    canAccessRailnet: canAccessRailnet(profile, ktlAdmin ? { railnet_enabled: true } : license),
    canAccessPhishing: canAccessPhishing(
      profile,
      ktlAdmin ? { phishing_enabled: true } : license
    ),
    license: ktlAdmin ? null : license,
    isKtlAdmin: ktlAdmin,
    /** @deprecated */ isPlatformAdmin: ktlAdmin,
    isLoading: !ktlAdmin && Boolean(profile?.org_id) && isLoading,
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
