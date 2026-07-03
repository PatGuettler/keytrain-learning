import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useRole } from '@/hooks/useRole'
import { useUiStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/brand/AppLogo'
import { useRailnetAccess } from '@/hooks/useRailnetAccess'
import { navByRole } from './nav-config'

export function MobileSidebar() {
  const { role } = useRole()
  const location = useLocation()
  const { sidebarOpen, setSidebarOpen } = useUiStore()
  const { canAccessRailnet } = useRailnetAccess()
  const items = (role ? navByRole[role] : []).filter(
    (item) => !item.requiresRailnet || canAccessRailnet
  )

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
            <AppLogo className="h-9 w-auto" />
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
