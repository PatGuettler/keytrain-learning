import { NavLink } from 'react-router-dom'
import { BookOpen, GraduationCap, LayoutDashboard, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRole } from '@/hooks/useRole'

export function MobileNav() {
  const { role, isAdmin, isManager } = useRole()

  const items =
    role === 'employee'
      ? [
          { to: '/employee/dashboard', icon: LayoutDashboard, label: 'Home' },
          { to: '/employee/training', icon: GraduationCap, label: 'Training' },
        ]
      : isManager
        ? [
            { to: '/manager/dashboard', icon: LayoutDashboard, label: 'Home' },
            { to: '/manager/team', icon: Users, label: 'Team' },
            { to: '/manager/training', icon: GraduationCap, label: 'Training' },
          ]
        : isAdmin
          ? [
              { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Home' },
              { to: '/admin/courses', icon: BookOpen, label: 'Courses' },
              { to: '/admin/users', icon: User, label: 'Users' },
            ]
          : []

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
