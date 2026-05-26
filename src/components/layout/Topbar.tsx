import { LogOut, Moon, Sun, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useUiStore } from '@/store/uiStore'
import { isSupabaseConfigured } from '@/services/supabase'
import { Badge } from '@/components/ui/badge'

export function Topbar() {
  const { profile, logout, demoMode } = useAuth()
  const { theme, toggleTheme, toggleSidebar } = useUiStore()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold hidden sm:block">
          Welcome, {profile?.full_name?.split(' ')[0] ?? 'User'}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {!isSupabaseConfigured && (
          <Badge variant="warning">Demo Mode</Badge>
        )}
        {demoMode && isSupabaseConfigured && (
          <Badge variant="secondary">Demo Login</Badge>
        )}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
        <span className="text-sm text-muted-foreground capitalize hidden md:inline">{profile?.role}</span>
        <Button variant="outline" size="sm" onClick={() => logout().then(() => (window.location.href = '/login'))}>
          <LogOut className="h-4 w-4 mr-1" />
          Sign out
        </Button>
      </div>
    </header>
  )
}
