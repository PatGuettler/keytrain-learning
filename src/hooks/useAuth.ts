import { useAuthStore } from '@/store/authStore'
import { signIn, signOut } from '@/services/auth.service'
import { syncRequiredAssignmentsForUser } from '@/services/assignments.service'
import { updateProfile } from '@/services/users.service'
import { ROLE_DASHBOARD } from '@/lib/constants'
import { isPasswordLongEnough } from '@/lib/password'
import type { UserRole } from '@/types/user.types'

export function useAuth() {
  const { userId, email, profile, setAuth, clearAuth } = useAuthStore()

  const login = async (email: string, password: string) => {
    const result = await signIn(email, password)
    let profile = result.profile
    if (!isPasswordLongEnough(password)) {
      profile = await updateProfile(result.user.id, { password_upgrade_required: true })
    }
    setAuth({
      userId: result.user.id,
      email: result.user.email ?? email,
      profile,
    })
    if (profile.role !== 'admin') {
      await syncRequiredAssignmentsForUser(result.user.id)
    }
    return {
      dest: ROLE_DASHBOARD[profile.role],
      passwordUpgradeRequired: profile.password_upgrade_required,
    }
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
