import { backend } from '@/backend'
import { getResetPasswordRedirectUrl } from '@/backend/createBackend'
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

export async function getSession() {
  return backend.auth.getSession()
}
