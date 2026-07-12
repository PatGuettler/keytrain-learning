import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  CATALOG_PLAN_BASE_CENTS,
  CATALOG_SEAT_CENTS,
  PAYMENT_STRUCTURE_COPY,
  PLAN_LABELS,
  formatUsdFromCents,
  type OrgPlan,
} from '@/lib/seat-pricing'

type Tier = {
  plan: OrgPlan
  name: string
  description: string
  features: string[]
  highlighted?: boolean
}

const TIERS: Tier[] = [
  {
    plan: 'lms',
    name: PLAN_LABELS.lms,
    description: 'Courses, assignments, and org training dashboards.',
    features: [
      `Base ${formatUsdFromCents(CATALOG_PLAN_BASE_CENTS.lms)}/mo`,
      'Per-seat fees by role',
      'Required training & progress',
      'Org admin user management',
    ],
  },
  {
    plan: 'railnet',
    name: PLAN_LABELS.railnet,
    description: 'Host intelligence, compliance docs, and phishing — no LMS.',
    features: [
      `Base ${formatUsdFromCents(CATALOG_PLAN_BASE_CENTS.railnet)}/mo`,
      'RailNet reports & compliance',
      'Phishing campaigns',
      'Per-seat fees by role',
    ],
  },
  {
    plan: 'both',
    name: PLAN_LABELS.both,
    description: 'Full stack: LMS plus RailNet preparedness loop.',
    features: [
      `Base ${formatUsdFromCents(CATALOG_PLAN_BASE_CENTS.both)}/mo`,
      'Everything in LMS and RailNet',
      'Course staging from trends (roadmap)',
      'Per-seat fees by role',
    ],
    highlighted: true,
  },
]

export function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h1 className="text-4xl font-bold tracking-tight">Plans built for LMS, RailNet, or both</h1>
        <p className="mt-4 text-muted-foreground">
          Monthly total = plan base + seats. Org admin {formatUsdFromCents(CATALOG_SEAT_CENTS.org_admin)}
          , manager {formatUsdFromCents(CATALOG_SEAT_CENTS.manager)}, employee{' '}
          {formatUsdFromCents(CATALOG_SEAT_CENTS.employee)}. Rates lock at signup.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <Card
            key={tier.plan}
            className={cn(
              'flex flex-col',
              tier.highlighted && 'border-primary shadow-md ring-1 ring-primary/20'
            )}
          >
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
              <p className="pt-2 text-3xl font-bold tracking-tight">
                {formatUsdFromCents(CATALOG_PLAN_BASE_CENTS[tier.plan])}
                <span className="text-base font-normal text-muted-foreground">/mo base</span>
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <ul className="space-y-2 text-sm flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full">
                <Link to="/signup">Get started</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-10 border-muted">
        <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
          <p>{PAYMENT_STRUCTURE_COPY.billingCycle}</p>
          <p>{PAYMENT_STRUCTURE_COPY.proration}</p>
          <p>{PAYMENT_STRUCTURE_COPY.grandfathering}</p>
          <p>{PAYMENT_STRUCTURE_COPY.estimatedBanner}</p>
        </CardContent>
      </Card>
    </div>
  )
}
