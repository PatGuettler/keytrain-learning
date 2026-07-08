import { Link, Outlet } from 'react-router-dom'
import { AppLogo } from '@/components/brand/AppLogo'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
] as const

export function MarketingLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <AppLogo className="h-9 w-auto" />
            <span className="font-semibold text-lg hidden sm:inline">{APP_NAME}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <AppLogo className="h-8 w-auto" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Security awareness training, phishing simulations, and RailNet intelligence for modern teams.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
              <div className="space-y-2">
                <p className="font-medium">Learn</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li><Link to="/how-it-works" className="hover:text-foreground">How it works</Link></li>
                  <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Account</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li><Link to="/login" className="hover:text-foreground">Sign in</Link></li>
                  <li><Link to="/signup" className="hover:text-foreground">Get started</Link></li>
                </ul>
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <p className="font-medium">Company</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            © {new Date().getFullYear()} KeyTrain. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

type FeatureCardProps = {
  title: string
  description: string
  className?: string
}

export function FeatureCard({ title, description, className }: FeatureCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-6 shadow-sm', className)}>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
