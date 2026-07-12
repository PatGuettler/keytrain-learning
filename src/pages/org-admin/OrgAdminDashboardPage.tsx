import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchOrganizationById } from '@/services/organizations.service'
import { fetchOrgMembers } from '@/services/users.service'
import { fetchOrgBillingTerms } from '@/services/org-license.service'
import { computeOrgBill } from '@/lib/org-billing'
import { PLAN_LABELS, formatUsdFromCents } from '@/lib/seat-pricing'
import { useAuthStore } from '@/store/authStore'

export function OrgAdminDashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const orgId = profile?.org_id

  const { data: org } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => fetchOrganizationById(orgId!),
    enabled: Boolean(orgId),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: () => fetchOrgMembers(orgId!, true),
    enabled: Boolean(orgId),
  })

  const { data: terms } = useQuery({
    queryKey: ['org-billing-terms', orgId],
    queryFn: () => fetchOrgBillingTerms(orgId!),
    enabled: Boolean(orgId),
  })

  const bill = terms ? computeOrgBill(terms, users) : null
  const activeCount = users.filter((u) => u.is_active).length

  return (
    <div className="space-y-6">
      <PageHeader
        title={org?.name ?? 'Organization'}
        description="Manage users, billing, training, and RailNet for your organization."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active users</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{activeCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-medium">
            {bill ? PLAN_LABELS[bill.plan] : '—'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projected monthly</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {bill ? formatUsdFromCents(bill.monthlyTotalCents) : '—'}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/org-admin/users">Manage users</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/org-admin/billing">View billing</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/org-admin/training-reports">Training reports</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/org-admin/catalog">Security catalog</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/org-admin/railnet">RailNet</Link>
        </Button>
      </div>
    </div>
  )
}
