import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fish, Hexagon, GraduationCap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  CATALOG_PHISHING_ADDON_CENTS,
  PLAN_LABELS,
  formatUsdFromCents,
  type OrgPlan,
} from '@/lib/seat-pricing'
import {
  fetchOrgLicense,
  updateOrgLicenseEntitlements,
  type OrgLicense,
} from '@/services/org-license.service'

type Props = {
  orgId: string
  orgName: string
}

export function OrgEntitlementsCard({ orgId, orgName }: Props) {
  const queryClient = useQueryClient()

  const { data: license, isLoading } = useQuery({
    queryKey: ['org-license', orgId],
    queryFn: () => fetchOrgLicense(orgId),
    enabled: Boolean(orgId),
  })

  const mutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateOrgLicenseEntitlements>[1]) =>
      updateOrgLicenseEntitlements(orgId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['org-license', orgId] })
      void queryClient.invalidateQueries({ queryKey: ['org-billing-terms', orgId] })
    },
  })

  const current: Pick<
    OrgLicense,
    'lms_enabled' | 'railnet_enabled' | 'compliance_enabled' | 'phishing_enabled' | 'plan'
  > = {
    lms_enabled: license?.lms_enabled !== false,
    railnet_enabled: license?.railnet_enabled === true,
    compliance_enabled: license?.compliance_enabled === true,
    phishing_enabled: license?.phishing_enabled === true,
    plan: license?.plan ?? 'lms',
  }

  const toggle = (
    key: 'lms_enabled' | 'railnet_enabled' | 'phishing_enabled',
    enabled: boolean
  ) => {
    const next = {
      lms_enabled: key === 'lms_enabled' ? enabled : current.lms_enabled,
      railnet_enabled: key === 'railnet_enabled' ? enabled : current.railnet_enabled,
      phishing_enabled: key === 'phishing_enabled' ? enabled : current.phishing_enabled,
    }
    // Compliance follows RailNet for org admins (Intelligence package)
    const compliance_enabled =
      key === 'railnet_enabled' ? enabled : current.compliance_enabled && next.railnet_enabled

    let plan: OrgPlan = 'lms'
    if (next.lms_enabled && next.railnet_enabled) plan = 'both'
    else if (next.railnet_enabled) plan = 'railnet'
    else plan = 'lms'

    mutation.mutate({
      ...next,
      compliance_enabled,
      plan,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Paid features</CardTitle>
        <CardDescription>
          Toggle product entitlements for {orgName}. Org admins only see features that are
          enabled here. Use this for demos and for paid add-ons (RailNet / phishing).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading license…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Plan SKU</span>
              <Badge variant="outline">{PLAN_LABELS[current.plan]}</Badge>
            </div>

            <EntitlementRow
              icon={GraduationCap}
              title="Training (LMS)"
              description="Monthly catalog, assignments, and training reports."
              priceHint="Included in KeyTrain Standard"
              checked={current.lms_enabled}
              disabled={mutation.isPending}
              onCheckedChange={(v) => toggle('lms_enabled', v)}
            />

            <EntitlementRow
              icon={Hexagon}
              title="RailNet (Intelligence)"
              description="Threat intel, compliance helpers, and related org-admin tools."
              priceHint="Paid — KeyTrain w/ Intelligence"
              checked={current.railnet_enabled}
              disabled={mutation.isPending}
              onCheckedChange={(v) => toggle('railnet_enabled', v)}
            />

            <EntitlementRow
              icon={Fish}
              title="Phishing simulations"
              description="Create and run phishing campaigns for staff in this organization."
              priceHint={`Paid add-on — from ${formatUsdFromCents(CATALOG_PHISHING_ADDON_CENTS)}/mo (quote)`}
              checked={current.phishing_enabled}
              disabled={mutation.isPending}
              onCheckedChange={(v) => toggle('phishing_enabled', v)}
            />

            {mutation.isError ? (
              <p className="text-sm text-destructive">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : 'Could not update entitlements.'}
              </p>
            ) : null}
            {mutation.isSuccess ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Entitlements saved. Org admins may need to refresh to update the side menu.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function EntitlementRow({
  icon: Icon,
  title,
  description,
  priceHint,
  checked,
  disabled,
  onCheckedChange,
}: {
  icon: typeof GraduationCap
  title: string
  description: string
  priceHint: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (value: boolean) => void
}) {
  const id = `entitlement-${title.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="flex gap-3 min-w-0">
        <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-1">
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
            {title}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
          <p className="text-xs font-medium text-foreground/80">{priceHint}</p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      />
    </div>
  )
}
