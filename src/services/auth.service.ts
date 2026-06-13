import { backend } from '@/backend'
import { getResetPasswordRedirectUrl } from '@/lib/backend-config'
import { ACCOUNT_LOCKED_MESSAGE, INVALID_LOGIN_MESSAGE, isPasswordLongEnough } from '@/lib/password'
import { updateProfile } from '@/services/users.service'
import type { Profile } from '@/types/user.types'

export async function signIn(email: string, password: string) {
  try {
    return await backend.auth.signIn(email, password)
  } catch (err) {
    const message = err instanceof Error ? err.message : INVALID_LOGIN_MESSAGE
    if (message === ACCOUNT_LOCKED_MESSAGE) throw err
    throw new Error(INVALID_LOGIN_MESSAGE)
  }
}

export async function signOut() {
  return backend.auth.signOut()
}

export async function fetchProfile(userId: string): Promise<Profile> {
  return backend.auth.fetchProfile(userId)
}

export async function resetPassword(email: string) {
  return backend.auth.resetPassword(email, getResetPasswordRedirectUrl())
}

export async function updatePassword(password: string) {
  await backend.auth.updatePassword(password)
  const session = (await getSession()) as { user?: { id: string } } | null
  const userId = session?.user?.id
  if (userId && isPasswordLongEnough(password)) {
    await updateProfile(userId, { password_upgrade_required: false })
  }
}

export async function completeInvitationRegistration() {
  const session = (await getSession()) as { user?: { id: string } } | null
  const userId = session?.user?.id
  if (!userId) throw new Error('Not signed in.')
  await updateProfile(userId, { invitation_pending: false })
}

export async function getSession() {
  return backend.auth.getSession()
}
