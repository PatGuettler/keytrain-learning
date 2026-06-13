import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import type { ThemePreference } from '@/lib/theme'

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeDropdownItems() {
  const { theme, setTheme } = useUiStore()

  return (
    <>
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <DropdownMenuItem
          key={value}
          onSelect={(e) => {
            e.preventDefault()
            setTheme(value)
          }}
        >
          <Icon className="h-4 w-4 mr-2" />
          {label}
          {theme === value && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
      ))}
    </>
  )
}

export function ThemeSelectorButtons({ className }: { className?: string }) {
  const { theme, setTheme } = useUiStore()

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={theme === value ? 'default' : 'outline'}
          onClick={() => setTheme(value)}
        >
          <Icon className="h-4 w-4 mr-1.5" />
          {label}
        </Button>
      ))}
    </div>
  )
}
