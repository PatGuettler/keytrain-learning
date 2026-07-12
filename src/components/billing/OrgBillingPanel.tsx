import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileDown, Mail } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { computeOrgBill } from '@/lib/org-billing'
import {
  PLAN_LABELS,
  PAYMENT_STRUCTURE_COPY,
  formatUsdFromCents,
} from '@/lib/seat-pricing'
import { fetchOrgBillingTerms } from '@/services/org-license.service'
import { fetchOrgMembers } from '@/services/users.service'
import { exportOrgBillPdf } from '@/lib/pdf/org-bill'
import { useAuthStore } from '@/store/authStore'

export function OrgBillingPanel({
  orgId,
  orgName,
}: {
  orgId: string
  orgName: string
}) {
  const profile = useAuthStore((s) => s.profile)

  const { data: terms, isLoading: termsLoading } = useQuery({
    queryKey: ['org-billing-terms', orgId],
    queryFn: () => fetchOrgBillingTerms(orgId),
    enabled: Boolean(orgId),
  })

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['org-users', orgId, 'billing'],
    queryFn: () => fetchOrgMembers(orgId, true),
    enabled: Boolean(orgId),
  })

  const bill = useMemo(() => (terms ? computeOrgBill(terms, users) : null), [terms, users])

  const loading = termsLoading || usersLoading

  const handleEmail = () => {
    if (!bill || !profile?.email) return
    const subject = encodeURIComponent(`KeyTrain Learning bill — ${orgName}`)
    const body = encodeURIComponent(
      [
        `Organization: ${orgName}`,
        `Plan: ${PLAN_LABELS[bill.plan]}`,
        '',
        ...bill.lineItems.map(
          (l) =>
            `${l.label}${l.key !== 'plan_base' ? ` × ${l.quantity}` : ''}: ${formatUsdFromCents(l.subtotalCents)}`
        ),
        '',
        `Monthly total: ${formatUsdFromCents(bill.monthlyTotalCents)}`,
        '',
        PAYMENT_STRUCTURE_COPY.estimatedBanner,
        PAYMENT_STRUCTURE_COPY.billingCycle,
      ].join('\n')
    )
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Projected monthly charges for this organization (plan base + seats)."
        action={
          bill ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => exportOrgBillPdf({ orgName, bill, termsLockedAt: terms?.locked_at })}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleEmail}>
                <Mail className="mr-2 h-4 w-4" />
                Email bill
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {PAYMENT_STRUCTURE_COPY.estimatedBanner} {PAYMENT_STRUCTURE_COPY.billingCycle}{' '}
          {PAYMENT_STRUCTURE_COPY.proration} {PAYMENT_STRUCTURE_COPY.grandfathering}
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Loading bill…</CardContent>
        </Card>
      )}

      {!loading && !terms && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Billing terms are not set for this organization yet. Ask a KeyTrain Learning admin to
            apply the latest database migrations, or assign a plan on the organization page.
          </CardContent>
        </Card>
      )}

      {bill && terms && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Monthly bill</CardTitle>
            <Badge variant="outline">{PLAN_LABELS[bill.plan]}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              {bill.lineItems.map((line) => (
                <li key={line.key} className="flex justify-between gap-4">
                  <span>
                    {line.label}
                    {line.key !== 'plan_base' ? (
                      <span className="text-muted-foreground">
                        {' '}
                        · {line.quantity} × {formatUsdFromCents(line.unitCents)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {' '}
                        · {formatUsdFromCents(line.unitCents)}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{formatUsdFromCents(line.subtotalCents)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatUsdFromCents(bill.monthlyTotalCents)}</span>
            </div>
            {terms.locked_at && (
              <p className="text-xs text-muted-foreground">
                Rates locked since {new Date(terms.locked_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
