import { NavLink } from 'react-router-dom'
import { LayoutDashboard, GraduationCap, User, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRole } from '@/hooks/useRole'

export function MobileNav() {
  const { role, isAdmin, isManager } = useRole()

  const items =
    role === 'employee'
      ? [
          { to: '/employee/dashboard', icon: LayoutDashboard, label: 'Home' },
          { to: '/employee/training', icon: GraduationCap, label: 'Training' },
          { to: '/employee/profile', icon: User, label: 'Profile' },
        ]
      : isManager
        ? [
            { to: '/manager/dashboard', icon: LayoutDashboard, label: 'Home' },
            { to: '/manager/team', icon: User, label: 'Team' },
            { to: '/manager/assignments', icon: Menu, label: 'Assign' },
          ]
        : isAdmin
          ? [
              { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Home' },
              { to: '/admin/courses', icon: Menu, label: 'Courses' },
              { to: '/admin/users', icon: User, label: 'Users' },
            ]
          : []

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t bg-card safe-area-pb">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
