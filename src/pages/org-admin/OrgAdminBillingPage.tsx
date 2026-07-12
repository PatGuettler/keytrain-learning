import { useQuery } from '@tanstack/react-query'
import { OrgBillingPanel } from '@/components/billing/OrgBillingPanel'
import { fetchOrganizationById } from '@/services/organizations.service'
import { useAuthStore } from '@/store/authStore'

export function OrgAdminBillingPage() {
  const profile = useAuthStore((s) => s.profile)
  const orgId = profile?.org_id

  const { data: org } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => fetchOrganizationById(orgId!),
    enabled: Boolean(orgId),
  })

  if (!orgId) return null

  return <OrgBillingPanel orgId={orgId} orgName={org?.name ?? 'Organization'} />
}
