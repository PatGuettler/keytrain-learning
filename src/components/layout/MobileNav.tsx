import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useRole } from '@/hooks/useRole'
import { isTrainingPlayerPath } from '@/lib/training-paths'
import { mobileTabNavByRole } from './nav-config'

export function MobileNav() {
  const location = useLocation()
  const { role } = useRole()

  if (isTrainingPlayerPath(location.pathname)) return null

  const items = role ? mobileTabNavByRole[role] : []

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 safe-area-pb safe-area-px"
      aria-label="Main navigation"
    >
      <div className="flex h-[var(--mobile-nav-height)] items-stretch">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] sm:text-xs font-medium min-h-[48px] transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground active:bg-accent/50'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="truncate max-w-full">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
