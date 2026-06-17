export type ThemePreference = 'light' | 'dark' | 'system'

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return preference
}

export function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  updateFavicon(resolved)
  updateThemeColor(resolved)
}

function updateFavicon(resolved: 'light' | 'dark') {
  const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
  if (!link) return
  const base = import.meta.env.BASE_URL
  link.href = `${base}favicon-${resolved}.svg`
}

function updateThemeColor(resolved: 'light' | 'dark') {
  const meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']")
  if (!meta) return
  meta.content = resolved === 'dark' ? '#7A90A8' : '#5CB4A8'
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
