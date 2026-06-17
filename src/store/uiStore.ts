import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  applyTheme,
  ensureSystemThemeListener,
  normalizeThemePreference,
  type ThemePreference,
} from '@/lib/theme'

interface UiState {
  sidebarOpen: boolean
  theme: ThemePreference
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: ThemePreference) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      theme: 'system',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
    }),
    {
      name: 'keytrainlearning-ui',
      merge: (persisted, current) => {
        const stored = persisted as Partial<UiState> | undefined
        const theme = normalizeThemePreference(stored?.theme)
        return {
          ...current,
          ...stored,
          theme,
        }
      },
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme)
      },
    }
  )
)

ensureSystemThemeListener(() => useUiStore.getState().theme)
applyTheme(useUiStore.getState().theme)
