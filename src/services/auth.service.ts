import { backend } from '@/backend'
import { getResetPasswordRedirectUrl } from '@/lib/backend-config'
import { updateProfile } from '@/services/users.service'
import type { Profile } from '@/types/user.types'

export async function signIn(email: string, password: string) {
  return backend.auth.signIn(email, password)
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
  return backend.auth.updatePassword(password)
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
