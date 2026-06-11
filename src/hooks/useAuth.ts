import { useAuthStore } from '@/store/authStore'
import { signIn, signOut } from '@/services/auth.service'
import { ROLE_DASHBOARD } from '@/lib/constants'
import type { UserRole } from '@/types/user.types'

export function useAuth() {
  const { userId, email, profile, setAuth, clearAuth } = useAuthStore()

  const login = async (email: string, password: string) => {
    const result = await signIn(email, password)
    setAuth({
      userId: result.user.id,
      email: result.user.email ?? email,
      profile: result.profile,
    })
    return ROLE_DASHBOARD[result.profile.role]
  }

  const logout = async () => {
    await signOut()
    clearAuth()
  }

  return {
    userId,
    email,
    profile,
    isAuthenticated: Boolean(userId && profile),
    role: profile?.role as UserRole | undefined,
    login,
    logout,
  }
}
