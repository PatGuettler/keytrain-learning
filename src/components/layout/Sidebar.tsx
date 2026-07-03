import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useRole } from '@/hooks/useRole'
import { AppLogo } from '@/components/brand/AppLogo'
import { useRailnetAccess } from '@/hooks/useRailnetAccess'
import { navByRole } from './nav-config'

export function Sidebar() {
  const { role } = useRole()
  const { canAccessRailnet } = useRailnetAccess()
  const items = (role ? navByRole[role] : []).filter(
    (item) => !item.requiresRailnet || canAccessRailnet
  )

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <AppLogo className="h-10 w-auto" />
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
