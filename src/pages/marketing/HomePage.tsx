import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FeatureCard } from '@/components/marketing/MarketingLayout'

const FEATURES = [
  {
    title: 'Required training',
    description:
      'Assign courses, track completion, and give managers visibility into team progress — built for busy teams across your organization.',
  },
  {
    title: 'Phishing simulations',
    description:
      'Run realistic campaigns, measure click rates, and follow up with targeted lessons when people need help.',
  },
  {
    title: 'RailNet intelligence',
    description:
      'Aggregate anonymized security signals from KeyTrain desktop hosts. Review trends, reports, and organizational risk in one place.',
    learnMoreHref: 'https://keytrainsecure.com/',
    learnMoreLabel: 'Learn more about KeyTrain',
  },
  {
    title: 'Compliance workflows',
    description:
      'Generate and maintain security documentation — incident response, acceptable use, risk analysis, and more.',
  },
  {
    title: 'Multi-tenant organizations',
    description:
      'Each business unit or location gets its own org, roles, and training assignments.',
  },
  {
    title: 'Reporting & dashboards',
    description:
      'Admins see completion rates and training gaps. Org leaders with RailNet access get leadership-ready trend reports.',
  },
] as const

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/40"
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28">
          <p className="text-sm font-medium text-primary mb-4">Security awareness for every organization</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl">
            Train your team. Simulate threats. See the bigger picture.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {`KeyTrain Learning is the compliance portal for assigned security training, phishing exercises, and RailNet reporting — paired with the KeyTrain desktop agent on every workstation.`}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/signup">Get started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link to="/contact">Talk to us</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 scroll-mt-20">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Everything in one portal</h2>
          <p className="mt-3 text-muted-foreground">
            From frontline staff taking annual HIPAA refreshers to security leads reviewing RailNet
            trend reports — KTL is where your program lives.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              {...('learnMoreHref' in feature
                ? {
                    learnMoreHref: feature.learnMoreHref,
                    learnMoreLabel: feature.learnMoreLabel,
                  }
                : {})}
            />
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">See how KeyTrain works</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Watch sample walkthroughs for admins, managers, and security leads.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link to="/how-it-works">How it works</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Ready to bring KeyTrain to your organization?</h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Request access for your team or sign in if you already have an account.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/contact">Contact sales</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/pricing">View pricing</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
