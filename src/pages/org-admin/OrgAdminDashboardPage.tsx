import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Building2, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { fetchOrgBillingTerms, fetchOrgLicense } from '@/services/org-license.service'
import { fetchMyOrgMemberships } from '@/services/org-memberships.service'
import { fetchOrgMembers } from '@/services/users.service'
import { computeOrgBill } from '@/lib/org-billing'
import { PLAN_LABELS, formatUsdFromCents } from '@/lib/seat-pricing'
import { orgAdminManagedOrgIds } from '@/lib/org-admin-access'
import { useAuthStore } from '@/store/authStore'
import {
  canAccessPhishing,
  canAccessRailnet,
} from '@/services/org-license.service'

type OrgFilterId = 'all' | string

type OrgDashRow = {
  orgId: string
  orgName: string
  activeUsers: number
  planLabel: string
  monthlyCents: number | null
  railnet: boolean
  phishing: boolean
}

async function loadOrgDashRow(orgId: string, orgName: string): Promise<OrgDashRow> {
  const [terms, users, license] = await Promise.all([
    fetchOrgBillingTerms(orgId),
    fetchOrgMembers(orgId, true),
    fetchOrgLicense(orgId),
  ])
  const bill = terms ? computeOrgBill(terms, users) : null
  return {
    orgId,
    orgName,
    activeUsers: users.filter((u) => u.is_active).length,
    planLabel: bill ? PLAN_LABELS[bill.plan] : license ? PLAN_LABELS[license.plan] : '—',
    monthlyCents: bill?.monthlyTotalCents ?? null,
    railnet: license?.railnet_enabled === true,
    phishing: license?.phishing_enabled === true,
  }
}

export function OrgAdminDashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const userId = useAuthStore((s) => s.userId)
  const [orgFilter, setOrgFilter] = useState<OrgFilterId>('all')

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['my-org-memberships', userId],
    queryFn: fetchMyOrgMemberships,
    enabled: Boolean(userId),
  })

  const adminOrgs = useMemo(() => {
    const managedIds = orgAdminManagedOrgIds(profile, memberships)
    const byId = new Map<string, NonNullable<(typeof memberships)[number]['organization']>>()
    for (const m of memberships) {
      if (m.role === 'org_admin' && m.organization && managedIds.includes(m.org_id)) {
        byId.set(m.org_id, m.organization)
      }
    }
    return managedIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .sort((a, b) => a!.name.localeCompare(b!.name)) as NonNullable<
      (typeof memberships)[number]['organization']
    >[]
  }, [memberships, profile])

  useEffect(() => {
    if (orgFilter === 'all') return
    if (!adminOrgs.some((o) => o.id === orgFilter)) setOrgFilter('all')
  }, [adminOrgs, orgFilter])

  const selectedOrgIds = useMemo(() => {
    if (orgFilter === 'all') return adminOrgs.map((o) => o.id)
    return adminOrgs.some((o) => o.id === orgFilter) ? [orgFilter] : adminOrgs.map((o) => o.id)
  }, [orgFilter, adminOrgs])

  const rowQueries = useQueries({
    queries: selectedOrgIds.map((orgId) => {
      const name = adminOrgs.find((o) => o.id === orgId)?.name ?? orgId
      return {
        queryKey: ['org-admin-dash-row', orgId],
        queryFn: () => loadOrgDashRow(orgId, name),
        enabled: selectedOrgIds.length > 0,
      }
    }),
  })

  const rows = useMemo(
    () => rowQueries.map((q) => q.data).filter((r): r is OrgDashRow => Boolean(r)),
    [rowQueries]
  )

  const isLoading =
    membershipsLoading || (selectedOrgIds.length > 0 && rowQueries.some((q) => q.isLoading))

  const totals = useMemo(() => {
    const activeUsers = rows.reduce((sum, r) => sum + r.activeUsers, 0)
    const monthlyCents = rows.reduce((sum, r) => sum + (r.monthlyCents ?? 0), 0)
    const plans = [...new Set(rows.map((r) => r.planLabel).filter((p) => p !== '—'))]
    return {
      orgCount: rows.length,
      activeUsers,
      monthlyCents,
      planSummary:
        plans.length === 0 ? '—' : plans.length === 1 ? plans[0]! : `${plans.length} plans`,
    }
  }, [rows])

  const selectedOrg = orgFilter === 'all' ? null : adminOrgs.find((o) => o.id === orgFilter) ?? null
  const selectedRow = selectedOrg ? rows.find((r) => r.orgId === selectedOrg.id) : null

  const showRailnet =
    selectedRow != null
      ? canAccessRailnet(profile, { railnet_enabled: selectedRow.railnet })
      : false
  const showPhishing =
    selectedRow != null
      ? canAccessPhishing(profile, { phishing_enabled: selectedRow.phishing })
      : false

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview across organizations you administer. Filter to one org, or keep All selected."
      />

      <div className="space-y-2 max-w-md">
        <Label htmlFor="org-admin-dash-filter">Organization</Label>
        <select
          id="org-admin-dash-filter"
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All organizations</option>
          {adminOrgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
              {org.id === profile?.org_id ? ' (active)' : ''}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      ) : adminOrgs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            You do not administer any organizations yet.{' '}
            <Link to="/org-admin/organizations" className="text-primary underline-offset-2 hover:underline">
              Create one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organizations</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{totals.orgCount}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active users</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{totals.activeUsers}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {orgFilter === 'all' ? 'Plans' : 'Plan'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-medium">{totals.planSummary}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {orgFilter === 'all' ? 'Projected monthly (selected)' : 'Projected monthly'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatUsdFromCents(totals.monthlyCents)}
              </CardContent>
            </Card>
          </div>

          {orgFilter === 'all' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your organizations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {rows.map((row) => (
                    <li key={row.orgId}>
                      <button
                        type="button"
                        className="w-full flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-left hover:bg-accent/50 transition-colors"
                        onClick={() => setOrgFilter(row.orgId)}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <Building2 className="h-5 w-5 text-primary shrink-0" />
                          <span className="min-w-0">
                            <span className="font-medium block truncate">
                              {row.orgName}
                              {row.orgId === profile?.org_id ? (
                                <Badge variant="secondary" className="ml-2 text-xs align-middle">
                                  Active
                                </Badge>
                              ) : null}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {row.planLabel} · {row.activeUsers} active users
                            </span>
                          </span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums shrink-0">
                          {row.monthlyCents != null
                            ? formatUsdFromCents(row.monthlyCents)
                            : '—'}
                          <span className="text-xs font-normal text-muted-foreground"> / mo</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/org-admin/organizations">Organizations</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/org-admin/billing">View billing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/org-admin/training-reports">Training reports</Link>
            </Button>
            {selectedOrg ? (
              <Button asChild variant="outline">
                <Link to={`/org-admin/organizations/${selectedOrg.id}`}>
                  <Users className="h-4 w-4 mr-1" />
                  Manage users
                </Link>
              </Button>
            ) : null}
            {showRailnet ? (
              <Button asChild variant="outline">
                <Link to="/org-admin/railnet">RailNet</Link>
              </Button>
            ) : null}
            {showPhishing ? (
              <Button asChild variant="outline">
                <Link to="/org-admin/phishing/campaigns">Phishing sims</Link>
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
