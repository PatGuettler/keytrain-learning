import { getSupabase, isSupabaseConfigured } from './supabase'
import { DEMO_USERS } from '@/lib/constants'
import { demoProfiles } from './demo-data'
import type { Profile } from '@/types/user.types'

export async function signIn(email: string, password: string) {
  const supabase = getSupabase()
  if (!supabase) {
    const demo = Object.values(DEMO_USERS).find((u) => u.email === email && u.password === password)
    if (!demo) throw new Error('Invalid credentials. Use demo accounts listed on the login page.')
    const profile = demoProfiles.find((p) => p.id === demo.id)!
    return { user: { id: demo.id, email: demo.email }, profile, demoMode: true }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  const profile = await fetchProfile(data.user.id)
  return { user: data.user, profile, demoMode: false }
}

export async function signOut() {
  const supabase = getSupabase()
  if (supabase) await supabase.auth.signOut()
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const supabase = getSupabase()
  if (!supabase) {
    const p = demoProfiles.find((x) => x.id === userId)
    if (!p) throw new Error('Profile not found')
    return p
  }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data as Profile
}

export async function resetPassword(email: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Configure Supabase to use password reset')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function getSession() {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}
