import { getSupabase, isSupabaseConfigured } from './supabase'
import { getDemoProfiles } from './demo-data'
import type { Profile, UserRole } from '@/types/user.types'

export async function fetchProfiles(filters?: {
  orgId?: string
  managerId?: string
  role?: UserRole
}): Promise<Profile[]> {
  if (!isSupabaseConfigured) {
    let list = getDemoProfiles()
    if (filters?.role) list = list.filter((p) => p.role === filters.role)
    if (filters?.managerId) list = list.filter((p) => p.manager_id === filters.managerId)
    return list
  }
  let q = getSupabase()!.from('profiles').select('*').eq('is_active', true)
  if (filters?.orgId) q = q.eq('org_id', filters.orgId)
  if (filters?.managerId) q = q.eq('manager_id', filters.managerId)
  if (filters?.role) q = q.eq('role', filters.role)
  const { data, error } = await q.order('full_name')
  if (error) throw error
  return data as Profile[]
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>) {
  if (!isSupabaseConfigured) return patch as Profile
  const { data, error } = await getSupabase()!.from('profiles').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Profile
}
