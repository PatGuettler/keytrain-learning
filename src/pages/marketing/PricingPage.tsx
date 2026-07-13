import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  CATALOG_PHISHING_ADDON_CENTS,
  CATALOG_PLAN_BASE_CENTS,
  CATALOG_SEAT_CENTS,
  PAYMENT_STRUCTURE_COPY,
  formatUsdFromCents,
} from '@/lib/seat-pricing'

type BillingCadence = 'monthly' | 'yearly'

type PlanCard = {
  id: string
  name: string
  priceLabel: string
  priceSuffix: string
  description: string
  includesLabel?: string
  features: string[]
  cta: { label: string; to: string }
  highlighted?: boolean
  custom?: boolean
}

const PLANS: PlanCard[] = [
  {
    id: 'lite',
    name: 'Lite',
    priceLabel: formatUsdFromCents(CATALOG_PLAN_BASE_CENTS.lms),
    priceSuffix: '/ mo.',
    description: 'Security awareness training for your organization.',
    features: [
      'Course catalog & assignments',
      'Required training & progress tracking',
      'Org admin user management',
      'Manager dashboards & reports',
      'Per-seat fees by role',
    ],
    cta: { label: 'Get started', to: '/signup' },
  },
  {
    id: 'pro',
    name: 'Pro',
    priceLabel: formatUsdFromCents(CATALOG_PLAN_BASE_CENTS.both),
    priceSuffix: '/ mo.',
    description: 'Training plus RailNet intelligence and compliance.',
    includesLabel: 'Everything in Lite, plus:',
    features: [
      'RailNet host intelligence reports',
      'Compliance document library',
      'Trend → course staging workflow',
      'Preparedness loop for your org',
      'Per-seat fees by role',
    ],
    cta: { label: 'Get started', to: '/signup' },
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceLabel: 'Custom',
    priceSuffix: '',
    description: 'For larger orgs that need invoicing, pooled seats, or advanced controls.',
    includesLabel: 'Everything in Pro, plus:',
    features: [
      'Invoice / PO billing',
      'Custom seat or volume pricing',
      'Dedicated onboarding support',
      'Priority support & account management',
      'Security & compliance review',
    ],
    cta: { label: 'Contact sales', to: '/contact' },
    custom: true,
  },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is the right plan for me?',
    a: 'Choose Lite if you only need LMS training and assignments. Choose Pro if you also want RailNet intelligence, compliance docs, and trend-based course staging. Add phishing simulations as a separate org add-on on either plan.',
  },
  {
    q: 'How does monthly billing work?',
    a: `${PAYMENT_STRUCTURE_COPY.billingCycle} ${PAYMENT_STRUCTURE_COPY.proration}`,
  },
  {
    q: 'Are seat fees included in the plan base?',
    a: `No. Your bill is plan base + optional phishing add-on + seats. Catalog seats: org admin ${formatUsdFromCents(CATALOG_SEAT_CENTS.org_admin)}, manager ${formatUsdFromCents(CATALOG_SEAT_CENTS.manager)}, employee ${formatUsdFromCents(CATALOG_SEAT_CENTS.employee)} per month.`,
  },
  {
    q: 'Is phishing included in Pro?',
    a: `No. Phishing simulations are an optional add-on at ${formatUsdFromCents(CATALOG_PHISHING_ADDON_CENTS)} per organization per month, billed separately from Lite or Pro.`,
  },
  {
    q: 'Do prices change for existing customers?',
    a: PAYMENT_STRUCTURE_COPY.grandfathering,
  },
  {
    q: 'Are prices inclusive of taxes?',
    a: 'All prices are exclusive of any applicable taxes. See our terms for more information.',
  },
  {
    q: 'What are my payment options?',
    a: 'Self-serve checkout with major cards is coming soon via Stripe. For invoice-based billing, choose Enterprise and contact us.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-[15px] font-medium tracking-tight hover:text-foreground/90"
        aria-expanded={open}
      >
        {q}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      {open ? (
        <p className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">{a}</p>
      ) : null}
    </div>
  )
}

export function PricingPage() {
  const [cadence, setCadence] = useState<BillingCadence>('monthly')

  return (
    <div className="relative overflow-hidden">
      {/* Soft atmospheric wash — Cursor-like clean field */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Pricing</h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Plan base + seats. Optional phishing. Rates lock at signup.
          </p>

          <div className="mt-8 inline-flex items-center rounded-full border bg-muted/40 p-1 text-sm">
            <button
              type="button"
              onClick={() => setCadence('monthly')}
              className={cn(
                'rounded-full px-4 py-1.5 font-medium transition-colors',
                cadence === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCadence('yearly')}
              className={cn(
                'rounded-full px-4 py-1.5 font-medium transition-colors',
                cadence === 'yearly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Yearly
            </button>
          </div>
          {cadence === 'yearly' ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Yearly billing is coming soon — monthly rates shown below.
            </p>
          ) : null}
        </div>

        {/* Plan grid — Cursor-style equal columns */}
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-0 lg:rounded-2xl lg:border lg:bg-card lg:overflow-hidden">
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-card p-6 sm:p-8 lg:rounded-none lg:border-0',
                i > 0 && 'lg:border-l',
                plan.highlighted && 'relative bg-muted/30 lg:bg-muted/20'
              )}
            >
              {plan.highlighted ? (
                <span className="mb-3 inline-flex w-fit rounded-md bg-foreground px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-background">
                  Recommended
                </span>
              ) : (
                <span className="mb-3 h-5" aria-hidden />
              )}

              <h2 className="text-lg font-semibold tracking-tight">{plan.name}</h2>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">
                  {plan.priceLabel}
                </span>
                {plan.priceSuffix ? (
                  <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.custom ? 'Talk to us' : 'plan base · seats extra'}
              </p>

              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                {plan.description}
              </p>

              <Button
                asChild
                className="mt-6 w-full"
                variant={plan.highlighted ? 'default' : 'outline'}
              >
                <Link to={plan.cta.to}>{plan.cta.label}</Link>
              </Button>

              {plan.includesLabel ? (
                <p className="mt-8 text-sm font-medium">{plan.includesLabel}</p>
              ) : (
                <p className="mt-8 text-sm font-medium">Includes:</p>
              )}
              <ul className="mt-3 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-foreground mt-0.5" strokeWidth={2.25} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Add-on + seats — secondary strip like Cursor usage notes */}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6 sm:p-7">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-base font-semibold tracking-tight">Phishing add-on</h3>
              <p className="text-2xl font-semibold tabular-nums">
                {formatUsdFromCents(CATALOG_PHISHING_ADDON_CENTS)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/ org / mo.</span>
              </p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Optional simulated phishing campaigns for your organization. Not included in Lite or
              Pro — enable when you need it.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {[
                'Campaign templates & scheduling',
                'Click / report analytics',
                'Works with Lite or Pro',
              ].map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-foreground mt-0.5" strokeWidth={2.25} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border bg-card p-6 sm:p-7">
            <h3 className="text-base font-semibold tracking-tight">Seat pricing</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Added on top of the plan base (and phishing, if enabled). Same rates on Lite and Pro.
            </p>
            <dl className="mt-5 space-y-3 text-sm">
              {(
                [
                  ['Org admin', CATALOG_SEAT_CENTS.org_admin],
                  ['Manager', CATALOG_SEAT_CENTS.manager],
                  ['Employee', CATALOG_SEAT_CENTS.employee],
                ] as const
              ).map(([label, cents]) => (
                <div key={label} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium tabular-nums">
                    {formatUsdFromCents(cents)}
                    <span className="font-normal text-muted-foreground"> / mo</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {PAYMENT_STRUCTURE_COPY.estimatedBanner}
        </p>

        {/* Example bill */}
        <div className="mt-10 rounded-2xl border border-dashed bg-muted/20 px-6 py-5 text-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Example:</span> Pro (
          {formatUsdFromCents(CATALOG_PLAN_BASE_CENTS.both)}) + phishing (
          {formatUsdFromCents(CATALOG_PHISHING_ADDON_CENTS)}) + 1 org admin + 2 managers + 10
          employees ={' '}
          <span className="font-semibold text-foreground tabular-nums">
            {formatUsdFromCents(
              CATALOG_PLAN_BASE_CENTS.both +
                CATALOG_PHISHING_ADDON_CENTS +
                CATALOG_SEAT_CENTS.org_admin +
                2 * CATALOG_SEAT_CENTS.manager +
                10 * CATALOG_SEAT_CENTS.employee
            )}
          </span>
          /month.
        </div>

        {/* FAQ — Cursor-style */}
        <section className="mt-20 sm:mt-28 max-w-2xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-semibold tracking-tight mb-8">
            Questions & Answers
          </h2>
          <div>
            {FAQS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        <section className="mt-20 sm:mt-28 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Get started with KeyTrain
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Stand up training for your org in minutes. Card checkout coming soon.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contact">Contact sales</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
