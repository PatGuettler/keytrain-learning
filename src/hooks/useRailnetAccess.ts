import { useQuery } from '@tanstack/react-query'
import { canAccessRailnet, isPlatformAdmin } from '@/services/org-license.service'
import { useAuthStore } from '@/store/authStore'

export function useRailnetAccess() {
  const profile = useAuthStore((s) => s.profile)
  const platformAdmin = isPlatformAdmin(profile)

  const { data: canAccess = platformAdmin, isLoading } = useQuery({
    queryKey: ['org-license', 'railnet-access', profile?.org_id],
    queryFn: () => canAccessRailnet(profile),
    enabled: Boolean(profile?.role === 'admin' && !platformAdmin),
    staleTime: 5 * 60_000,
  })

  return {
    canAccessRailnet: profile?.role === 'admin' && (platformAdmin || canAccess),
    isLoading: !platformAdmin && profile?.role === 'admin' && isLoading,
  }
}
