import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PAYMENT_STRUCTURE_COPY } from '@/lib/seat-pricing'

type BillingCadence = 'monthly' | 'yearly'

type PlanCard = {
  id: string
  name: string
  priceLabel: string
  priceSuffix: string
  priceNote: string
  description: string
  includesLabel?: string
  features: string[]
  footnote?: string
  cta: { label: string; to: string }
  highlighted?: boolean
}

/** Display order: Intelligence (left), Standard (middle), Enterprise (right). */
const PLANS: PlanCard[] = [
  {
    id: 'intelligence',
    name: 'w/ Intelligence',
    priceLabel: 'Custom',
    priceSuffix: '',
    priceNote: 'Talk to us',
    description: 'Desktop KeyTrain plus RailNet intelligence, compliance, and training.',
    includesLabel: 'Everything in Standard, plus:',
    features: [
      'KeyTrain desktop app license (KT)',
      'RailNet host intelligence & sync',
      'Compliance document library',
      'Trend → course staging workflow',
      'Preparedness loop for your org',
    ],
    cta: { label: 'Talk to us', to: '/contact' },
    highlighted: true,
  },
  {
    id: 'standard',
    name: 'Standard',
    priceLabel: '$60.00',
    priceSuffix: '/ mo.',
    priceNote: 'Up to 20 users included',
    description: 'Security awareness training for your organization.',
    features: [
      'Course catalog & assignments',
      'Required training & progress tracking',
      'Org admin user management',
      'Manager dashboards & reports',
    ],
    footnote:
      'Standard base includes up to 20 users (includes an org admin and manager account). Additional users: $2.20 each up to 100, $1.90 from 101–200. Call for pricing beyond that.',
    cta: { label: 'Get started', to: '/signup' },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceLabel: 'Custom',
    priceSuffix: '',
    priceNote: 'Talk to us',
    description: 'For larger orgs that need invoicing, pooled seats, or advanced controls.',
    includesLabel: 'Everything in w/ Intelligence, plus:',
    features: [
      'Invoice / PO billing',
      'Custom seat or volume pricing',
      'Dedicated onboarding support',
      'Priority support & account management',
      'Security & compliance review',
    ],
    cta: { label: 'Contact sales', to: '/contact' },
  },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is the right plan for me?',
    a: 'Choose Standard for portal training with up to 20 users included. Choose w/ Intelligence if you need the KeyTrain desktop app, RailNet host intelligence, compliance docs, and trend-based course staging. Enterprise is for invoice billing and custom volume pricing. Phishing simulations are an optional add-on — talk to us to enable them.',
  },
  {
    q: 'Does w/ Intelligence include the KeyTrain desktop app?',
    a: 'Yes. KeyTrain with Intelligence includes a license to activate the KeyTrain desktop app (KT) on org hosts. Hosts sync into RailNet so you get intelligence, compliance, and the preparedness loop. Standard is portal training only and does not include a KT desktop license.',
  },
  {
    q: 'How does Standard user pricing work?',
    a: 'The $60/month Standard base includes up to 20 users (including an org admin and a manager). Additional users are $2.20 each up to 100, then $1.90 from 101–200. Call us for pricing beyond 200 users.',
  },
  {
    q: 'How does monthly billing work?',
    a: `${PAYMENT_STRUCTURE_COPY.billingCycle} ${PAYMENT_STRUCTURE_COPY.proration}`,
  },
  {
    q: 'Is phishing included?',
    a: 'No. Phishing simulations are an optional add-on available with any plan. Talk to us for pricing and enablement.',
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Pricing</h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Clear plan options. Optional phishing. Rates lock at signup.
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
              <p className="mt-1 text-xs text-muted-foreground">{plan.priceNote}</p>

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
              {plan.footnote ? (
                <p className="mt-5 text-xs leading-relaxed text-muted-foreground border-t pt-4">
                  {plan.footnote}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-10">
          <div className="rounded-2xl border bg-card p-6 sm:p-7 max-w-xl">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-base font-semibold tracking-tight">Phishing add-on</h3>
              <p className="text-sm font-semibold text-foreground">Talk to us</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Optional simulated phishing campaigns for your organization. Not included in any plan —
              enable when you need it.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {[
                'Campaign templates & scheduling',
                'Click / report analytics',
                'Available with any plan',
              ].map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-foreground mt-0.5" strokeWidth={2.25} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {PAYMENT_STRUCTURE_COPY.estimatedBanner}
        </p>

        <div className="mt-10 rounded-2xl border border-dashed bg-muted/20 px-6 py-5 text-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Example:</span> Standard at{' '}
          <span className="font-semibold text-foreground tabular-nums">$60</span>/month covers up to
          20 users. Add 30 more users at $2.20 each ={' '}
          <span className="font-semibold text-foreground tabular-nums">$126</span>/month. Optional
          phishing is quoted separately — talk to us.
        </div>

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
