import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileDown } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { computeOrgBill, type OrgBillSnapshot } from '@/lib/org-billing'
import { PLAN_LABELS, PAYMENT_STRUCTURE_COPY, formatUsdFromCents } from '@/lib/seat-pricing'
import { fetchOrgBillingTerms, type OrgLicense, fetchOrgLicense } from '@/services/org-license.service'
import { fetchOrgMembers } from '@/services/users.service'
import { fetchMyOrgMemberships } from '@/services/org-memberships.service'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

type OrgBillRow = {
  orgId: string
  orgName: string
  planLabel: string
  license: OrgLicense | null
  bill: OrgBillSnapshot | null
  userCount: number
  error?: string
}

async function loadOrgBillRow(orgId: string, orgName: string): Promise<OrgBillRow> {
  try {
    const supabase = (await import('@/services/supabase')).getSupabase()
    if (!supabase) throw new Error('Backend is not configured.')

    const [terms, users, license, { data: adminMemberships }] = await Promise.all([
      fetchOrgBillingTerms(orgId),
      fetchOrgMembers(orgId, true),
      fetchOrgLicense(orgId),
      supabase
        .from('organization_memberships')
        .select('user_id, role, is_active')
        .eq('org_id', orgId)
        .eq('role', 'org_admin')
        .eq('is_active', true),
    ])

    // Org admins who switched away still administer this org — include them as seats/users
    const userIds = new Set(users.map((u) => u.id))
    const syntheticAdmins = (adminMemberships ?? [])
      .filter((m) => !userIds.has(m.user_id))
      .map((m) => ({
        id: m.user_id,
        role: 'org_admin' as const,
        is_active: true,
      }))

    const billUsers = [...users, ...syntheticAdmins]
    const bill = terms ? computeOrgBill(terms, billUsers) : null
    return {
      orgId,
      orgName,
      planLabel: bill ? PLAN_LABELS[bill.plan] : license ? PLAN_LABELS[license.plan] : '—',
      license,
      bill,
      userCount: billUsers.filter((u) => u.is_active).length,
    }
  } catch (e) {
    return {
      orgId,
      orgName,
      planLabel: '—',
      license: null,
      bill: null,
      userCount: 0,
      error: e instanceof Error ? e.message : 'Failed to load',
    }
  }
}

export function MultiOrgBillingPanel() {
  const userId = useAuthStore((s) => s.userId)
  const activeOrgId = useAuthStore((s) => s.profile?.org_id)

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['my-org-memberships', userId],
    queryFn: fetchMyOrgMemberships,
    enabled: Boolean(userId),
  })

  const adminOrgs = useMemo(
    () =>
      memberships
        .filter((m) => m.role === 'org_admin')
        .map((m) => ({
          orgId: m.org_id,
          orgName: m.organization?.name ?? m.org_id,
        })),
    [memberships]
  )

  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (adminOrgs.length === 0) return
    setSelected((prev) => {
      if (prev.size > 0) {
        // Keep selection but drop orgs no longer administered
        const next = new Set([...prev].filter((id) => adminOrgs.some((o) => o.orgId === id)))
        return next.size > 0 ? next : new Set(adminOrgs.map((o) => o.orgId))
      }
      return new Set(adminOrgs.map((o) => o.orgId))
    })
  }, [adminOrgs])

  const { data: rows = [], isLoading: billsLoading } = useQuery({
    queryKey: ['multi-org-bills', adminOrgs.map((o) => o.orgId).join(',')],
    queryFn: async () =>
      Promise.all(adminOrgs.map((o) => loadOrgBillRow(o.orgId, o.orgName))),
    enabled: adminOrgs.length > 0,
  })

  const selectedRows = rows.filter((r) => selected.has(r.orgId))
  const selectedTotal = selectedRows.reduce(
    (sum, r) => sum + (r.bill?.monthlyTotalCents ?? 0),
    0
  )

  const toggle = (orgId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(orgId)
      else next.delete(orgId)
      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(adminOrgs.map((o) => o.orgId)) : new Set())
  }

  const loading = membershipsLoading || billsLoading

  const exportText = () => {
    const lines = [
      'KeyTrain Learning — Portfolio bill (estimated)',
      '',
      ...selectedRows.map((r) => {
        const total = r.bill ? formatUsdFromCents(r.bill.monthlyTotalCents) : 'n/a'
        return [
          `Organization: ${r.orgName}`,
          `Plan: ${r.planLabel}`,
          `Active users: ${r.userCount}`,
          ...(r.bill?.lineItems.map(
            (l) =>
              `  - ${l.label}${l.key !== 'plan_base' ? ` × ${l.quantity}` : ''}: ${formatUsdFromCents(l.subtotalCents)}`
          ) ?? []),
          `  Subtotal: ${total}`,
          '',
        ].join('\n')
      }),
      `Selected orgs total: ${formatUsdFromCents(selectedTotal)}`,
      '',
      PAYMENT_STRUCTURE_COPY.estimatedBanner,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'keytrain-portfolio-bill.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Projected monthly charges across organizations you administer. Select orgs to total."
        action={
          selectedRows.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={exportText}>
              <FileDown className="mr-2 h-4 w-4" />
              Export selected
            </Button>
          ) : undefined
        }
      />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {PAYMENT_STRUCTURE_COPY.estimatedBanner} Switch the active organization in the header to
          manage users, training, and RailNet for that org. Billing below can include every org you
          administer.
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Loading bills…</CardContent>
        </Card>
      ) : null}

      {!loading && adminOrgs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            You do not administer any organizations yet. Create one from the organization switcher.
          </CardContent>
        </Card>
      ) : null}

      {rows.length > 0 ? (
        <>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Organizations</CardTitle>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={selected.size === adminOrgs.length && adminOrgs.length > 0}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
                Select all
              </label>
            </CardHeader>
            <CardContent className="space-y-3">
              {rows.map((row) => {
                const checked = selected.has(row.orgId)
                return (
                  <div
                    key={row.orgId}
                    className={cn(
                      'rounded-lg border p-4',
                      row.orgId === activeOrgId && 'border-primary/40 bg-primary/5'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <label className="flex items-start gap-3 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-input"
                          checked={checked}
                          onChange={(e) => toggle(row.orgId, e.target.checked)}
                        />
                        <span>
                          <span className="font-medium block">
                            {row.orgName}
                            {row.orgId === activeOrgId ? (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Active
                              </Badge>
                            ) : null}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {row.planLabel} · {row.userCount} active users
                          </span>
                        </span>
                      </label>
                      <p className="text-lg font-semibold tabular-nums">
                        {row.bill
                          ? formatUsdFromCents(row.bill.monthlyTotalCents)
                          : '—'}
                        <span className="text-xs font-normal text-muted-foreground"> / mo</span>
                      </p>
                    </div>
                    {row.error ? (
                      <p className="mt-2 text-xs text-destructive">{row.error}</p>
                    ) : null}
                    {row.bill ? (
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {row.bill.lineItems.map((l) => (
                          <li key={l.key} className="flex justify-between gap-4">
                            <span>
                              {l.label}
                              {l.key !== 'plan_base' ? ` × ${l.quantity}` : ''}
                            </span>
                            <span className="tabular-nums">
                              {formatUsdFromCents(l.subtotalCents)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selected total</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {selected.size} organization{selected.size === 1 ? '' : 's'} selected
              </p>
              <p className="text-3xl font-semibold tabular-nums">
                {formatUsdFromCents(selectedTotal)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ mo</span>
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
