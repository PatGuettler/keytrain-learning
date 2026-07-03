import { PLATFORM_ORG_ID } from '@/lib/constants'
import { getSupabase } from '@/services/supabase'
import type { Profile } from '@/types/user.types'

export type OrgLicense = {
  org_id: string
  railnet_enabled: boolean
  compliance_enabled: boolean
  updated_at: string
}

function requireSupabase() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export function isPlatformAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === 'admin' && profile.org_id === PLATFORM_ORG_ID
}

export async function fetchOrgLicense(orgId: string): Promise<OrgLicense | null> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('org_license' as 'courses')
    .select('org_id, railnet_enabled, compliance_enabled, updated_at')
    .eq('org_id', orgId)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as OrgLicense) ?? null
}

export async function isRailnetEnabled(orgId: string): Promise<boolean> {
  const license = await fetchOrgLicense(orgId)
  return license?.railnet_enabled ?? false
}

export async function canAccessRailnet(profile: Profile | null | undefined): Promise<boolean> {
  if (!profile || profile.role !== 'admin') return false
  if (isPlatformAdmin(profile)) return true
  return isRailnetEnabled(profile.org_id)
}
