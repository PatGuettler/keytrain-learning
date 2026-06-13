import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  LayoutDashboard,
  Shield,
  Building2,
  GraduationCap,
  ShieldCheck,
  Users,
  LockKeyhole,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useRole } from '@/hooks/useRole'

const navByRole = {
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/admins', label: 'Admins', icon: ShieldCheck },
    { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/unlock-requests', label: 'Unlock requests', icon: LockKeyhole },
  ],
  manager: [
    { to: '/manager/training', label: 'Required Training', icon: GraduationCap },
    { to: '/manager/team', label: 'My Team', icon: Users },
  ],
  employee: [
    { to: '/employee/training', label: 'Required Training', icon: GraduationCap },
  ],
}

export function Sidebar() {
  const { role } = useRole()
  const items = role ? navByRole[role] : []

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Shield className="h-7 w-7 text-primary" />
        <span className="font-bold text-lg">{APP_NAME}</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
