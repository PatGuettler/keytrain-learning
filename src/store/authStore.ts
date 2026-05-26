import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types/user.types'

interface AuthState {
  userId: string | null
  email: string | null
  profile: Profile | null
  demoMode: boolean
  setAuth: (payload: { userId: string; email: string; profile: Profile; demoMode?: boolean }) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      email: null,
      profile: null,
      demoMode: false,
      setAuth: ({ userId, email, profile, demoMode = false }) =>
        set({ userId, email, profile, demoMode }),
      clearAuth: () => set({ userId: null, email: null, profile: null, demoMode: false }),
    }),
    { name: 'guardianmd-auth' }
  )
)
