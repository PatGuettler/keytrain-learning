import { useNavigate } from 'react-router-dom'
import { LogOut, Monitor, Moon, Shield, Sun, Menu, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useUiStore } from '@/store/uiStore'
import { APP_NAME, ROLE_PROFILE } from '@/lib/constants'
import type { ThemePreference } from '@/lib/theme'

export function Topbar() {
  const navigate = useNavigate()
  const { profile, logout, role } = useAuth()
  const { theme, setTheme, setSidebarOpen } = useUiStore()

  const handleSignOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const profilePath = role ? ROLE_PROFILE[role] : null

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between gap-2 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-3 sm:px-4 lg:px-6 safe-area-pt safe-area-px">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-11 w-11 shrink-0"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 items-center gap-2 lg:hidden">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <span className="font-semibold truncate">{APP_NAME}</span>
        </div>
        <h1 className="hidden lg:block text-lg font-semibold truncate">
          Welcome, {profile?.full_name?.split(' ')[0] ?? 'User'}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Account menu">
              <UserCircle className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile?.full_name ?? 'User'}</p>
                {profile?.email && (
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                )}
                {profile?.role && (
                  <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profilePath && (
              <DropdownMenuItem onSelect={() => navigate(profilePath)}>
                Profile
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as ThemePreference)}
            >
              <DropdownMenuRadioItem value="light" className="gap-2">
                <Sun className="h-4 w-4" />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" className="gap-2">
                <Moon className="h-4 w-4" />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system" className="gap-2">
                <Monitor className="h-4 w-4" />
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
