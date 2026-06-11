import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Shield,
  Building2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useRole } from '@/hooks/useRole'
import { useUiStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'

const navByRole = {
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/admins', label: 'Admins', icon: ShieldCheck },
    { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  ],
  manager: [
    { to: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/manager/team', label: 'My Team', icon: Users },
    { to: '/manager/training', label: 'Required Training', icon: GraduationCap },
  ],
  employee: [
    { to: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/employee/training', label: 'Required Training', icon: GraduationCap },
    { to: '/employee/profile', label: 'Profile', icon: Settings },
  ],
}

export function MobileSidebar() {
  const { role } = useRole()
  const location = useLocation()
  const { sidebarOpen, setSidebarOpen } = useUiStore()
  const items = role ? navByRole[role] : []

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, setSidebarOpen])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  if (!sidebarOpen) return null

  return (
    <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close menu"
        onClick={() => setSidebarOpen(false)}
      />
      <aside className="absolute left-0 top-0 bottom-0 w-[min(100vw-3rem,20rem)] flex flex-col bg-card border-r shadow-xl safe-area-pt safe-area-pb">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary shrink-0" />
            <span className="font-bold">{APP_NAME}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium min-h-[48px]',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  )
}
