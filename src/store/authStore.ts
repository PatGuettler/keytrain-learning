import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types/user.types'

interface AuthState {
  userId: string | null
  email: string | null
  profile: Profile | null
  setAuth: (payload: { userId: string; email: string; profile: Profile }) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      email: null,
      profile: null,
      setAuth: ({ userId, email, profile }) => set({ userId, email, profile }),
      clearAuth: () => set({ userId: null, email: null, profile: null }),
    }),
    { name: 'keytrainlearning-auth' }
  )
)
