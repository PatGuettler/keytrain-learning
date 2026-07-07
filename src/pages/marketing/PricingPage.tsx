import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Tier = {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlighted?: boolean
  cta: string
}

const TIERS: Tier[] = [
  {
    name: 'Team',
    price: 'Contact us',
    period: 'per organization',
    description: 'For a single hospital, clinic, or department getting started with awareness training.',
    features: [
      'Unlimited learners within your org',
      'Course library & assignments',
      'Manager team dashboard',
      'Phishing simulation campaigns',
      'Email support',
    ],
    cta: 'Request a quote',
  },
  {
    name: 'Organization',
    price: 'Contact us',
    period: 'per organization',
    description: 'Full program for growing health systems that need RailNet and compliance tooling.',
    features: [
      'Everything in Team',
      'RailNet reports for authorized leaders',
      'Compliance document generation',
      'Custom course staging from RailNet insights',
      'Priority onboarding',
    ],
    highlighted: true,
    cta: 'Talk to sales',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'multi-site',
    description: 'Multiple organizations, custom integrations, and dedicated success planning.',
    features: [
      'Everything in Organization',
      'Multi-org admin console',
      'KeyTrain desktop + RailNet at scale',
      'Custom training content',
      'Dedicated support channel',
    ],
    cta: 'Contact enterprise',
  },
]

export function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h1 className="text-4xl font-bold tracking-tight">Simple, organization-based pricing</h1>
        <p className="mt-4 text-muted-foreground">
          KeyTrain Learning is sold per organization — not per seat. We&apos;ll size a plan around your
          staff count, RailNet needs, and compliance goals.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={cn(
              'flex flex-col',
              tier.highlighted && 'border-primary shadow-md ring-1 ring-primary/20'
            )}
          >
            <CardHeader>
              {tier.highlighted && (
                <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
                  Most popular
                </p>
              )}
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
              <div className="pt-4">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-sm text-muted-foreground ml-2">{tier.period}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              <ul className="space-y-3 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={tier.highlighted ? 'default' : 'outline'} asChild>
                <Link to="/contact">{tier.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-12">
        Already a customer?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Sign in to your portal
        </Link>
      </p>
    </div>
  )
}
