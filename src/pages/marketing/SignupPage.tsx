import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Mail, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CATALOG_PLAN_BASE_CENTS,
  CATALOG_SEAT_CENTS,
  PAYMENT_STRUCTURE_COPY,
  formatUsdFromCents,
} from '@/lib/seat-pricing'

function SignupOptionCard({
  icon: Icon,
  title,
  description,
  highlighted,
  children,
  action,
}: {
  icon: typeof UserPlus
  title: string
  description: string
  highlighted?: boolean
  children: ReactNode
  action: ReactNode
}) {
  return (
    <Card
      className={`flex h-full flex-col ${highlighted ? 'border-primary/30 ring-1 ring-primary/20' : ''}`}
    >
      <CardHeader className="pb-2">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg leading-snug">{title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-0">
        <div className="min-h-[8.5rem] flex-1 space-y-2 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
        <div className="mt-6 w-full">{action}</div>
      </CardContent>
    </Card>
  )
}

export function SignupPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Get started with KeyTrain Learning</h1>
        <p className="mt-4 text-muted-foreground">
          Access is provisioned per organization. Pick the path that matches your situation.
        </p>
      </div>

      <div className="grid items-stretch gap-6 md:grid-cols-3">
        <SignupOptionCard
          icon={UserPlus}
          title="New organization"
          description="Your organization isn't on KeyTrain yet."
          action={
            <Button className="w-full" asChild>
              <Link to="/contact">Request access</Link>
            </Button>
          }
        >
          <p>We&apos;ll set up your organization, training library, and optional RailNet integration.</p>
        </SignupOptionCard>

        <SignupOptionCard
          icon={KeyRound}
          title="Have a join code"
          description="Your admin shared a code and you're ready to create an account."
          highlighted
          action={
            <Button className="w-full" asChild>
              <Link to="/join">Join with code</Link>
            </Button>
          }
        >
          <p>
            Enter your organization join code and work email at{' '}
            <code className="text-xs">/join</code>. The code verifies you&apos;re joining the right
            org.
          </p>
        </SignupOptionCard>

        <SignupOptionCard
          icon={Mail}
          title="Email invitation"
          description="Your admin added you and sent an invite email."
          action={
            <Button className="w-full" variant="outline" asChild>
              <Link to="/login">Sign in after accepting</Link>
            </Button>
          }
        >
          <p>
            Open the <strong className="text-foreground font-medium">link in that email</strong> to
            choose your password. Your organization is already assigned — no join code needed.
          </p>
          <p className="text-xs">
            Didn&apos;t get the email? Ask your admin to resend the invite from the organization
            users page.
          </p>
        </SignupOptionCard>
      </div>

      <Card className="mt-12 border-muted">
        <CardHeader>
          <CardTitle className="text-lg">Payment structure</CardTitle>
          <CardDescription>
            Shown upfront so org admins know how monthly billing works (card checkout coming soon).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <ul className="grid gap-2 sm:grid-cols-3">
            <li>
              <span className="font-medium text-foreground">LMS</span> base{' '}
              {formatUsdFromCents(CATALOG_PLAN_BASE_CENTS.lms)}/mo
            </li>
            <li>
              <span className="font-medium text-foreground">RailNet (Pro)</span> base{' '}
              {formatUsdFromCents(CATALOG_PLAN_BASE_CENTS.railnet)}/mo
            </li>
            <li>
              <span className="font-medium text-foreground">Both</span> base{' '}
              {formatUsdFromCents(CATALOG_PLAN_BASE_CENTS.both)}/mo
            </li>
          </ul>
          <p>
            Seats: org admin {formatUsdFromCents(CATALOG_SEAT_CENTS.org_admin)}, manager{' '}
            {formatUsdFromCents(CATALOG_SEAT_CENTS.manager)}, employee{' '}
            {formatUsdFromCents(CATALOG_SEAT_CENTS.employee)} — added on top of the plan base.
          </p>
          <p>
            Example: Both ({formatUsdFromCents(CATALOG_PLAN_BASE_CENTS.both)}) + 1 org admin + 2
            managers + 10 employees ={' '}
            {formatUsdFromCents(
              CATALOG_PLAN_BASE_CENTS.both +
                CATALOG_SEAT_CENTS.org_admin +
                2 * CATALOG_SEAT_CENTS.manager +
                10 * CATALOG_SEAT_CENTS.employee
            )}
            /month.
          </p>
          <p>{PAYMENT_STRUCTURE_COPY.billingCycle}</p>
          <p>{PAYMENT_STRUCTURE_COPY.proration}</p>
          <p>{PAYMENT_STRUCTURE_COPY.grandfathering}</p>
          <p>
            See{' '}
            <Link to="/pricing" className="font-medium text-primary hover:underline">
              pricing
            </Link>{' '}
            for plan details.
          </p>
        </CardContent>
      </Card>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
