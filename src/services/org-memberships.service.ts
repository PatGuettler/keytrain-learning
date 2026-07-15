import type { Organization, Profile, UserRole } from '@/types/user.types'
import { getSupabase } from '@/services/supabase'

export interface OrganizationMembership {
  id: string
  user_id: string
  org_id: string
  role: Exclude<UserRole, 'admin'>
  is_active: boolean
  created_at?: string
  updated_at?: string
  organization?: Organization | null
}

function requireSupabase() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchMyOrgMemberships(): Promise<OrganizationMembership[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('organization_memberships')
    .select('id, user_id, org_id, role, is_active, created_at, updated_at, organization:organizations(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => {
    const org = row.organization
    return {
      id: row.id,
      user_id: row.user_id,
      org_id: row.org_id,
      role: row.role as OrganizationMembership['role'],
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      organization: (Array.isArray(org) ? org[0] : org) as Organization | null,
    }
  })
}

export async function switchActiveOrganization(orgId: string): Promise<Profile> {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('switch_active_organization', {
    p_org_id: orgId,
  })
  if (error) throw new Error(error.message)
  return data as Profile
}

export async function createOrganizationAsOrgAdmin(name: string): Promise<Organization> {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('create_organization_as_org_admin', {
    p_name: name.trim(),
  })
  if (error) throw new Error(error.message)
  return data as Organization
}
