export type ThemePreference = 'light' | 'dark' | 'system'

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return preference
}

export function applyTheme(preference: ThemePreference) {
  document.documentElement.classList.toggle('dark', resolveTheme(preference) === 'dark')
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

let systemListenerAttached = false

/** Re-apply theme when OS preference changes and user chose "system". */
export function ensureSystemThemeListener(getPreference: () => ThemePreference) {
  if (systemListenerAttached || typeof window === 'undefined') return
  systemListenerAttached = true
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getPreference() === 'system') applyTheme('system')
  })
}
