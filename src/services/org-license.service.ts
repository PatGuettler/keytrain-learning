import { getSupabase } from '@/services/supabase'
import type { Profile } from '@/types/user.types'
import {
  type OrgBillingTerms,
  type OrgPlan,
  catalogTermsForPlan,
  entitlementsForPlan,
} from '@/lib/seat-pricing'

function requireSupabase() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export interface OrgLicense {
  org_id: string
  railnet_enabled: boolean
  compliance_enabled: boolean
  lms_enabled: boolean
  /** Paid phishing simulations add-on (independent of RailNet). */
  phishing_enabled: boolean
  plan: OrgPlan
  max_seats?: number | null
  updated_at?: string
}

/** KeyTrain Learning staff admin — full app access, not an organization member role. */
export function isKtlAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === 'admin'
}

export function isOrgAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === 'org_admin'
}

/** @deprecated Use isKtlAdmin — kept for call sites that mean platform staff admin. */
export function isPlatformAdmin(profile: Profile | null | undefined): boolean {
  return isKtlAdmin(profile)
}

export function canAccessLms(
  profile: Profile | null | undefined,
  license?: Pick<OrgLicense, 'lms_enabled'> | null
): boolean {
  if (!profile) return false
  if (isKtlAdmin(profile)) return true
  if (license && license.lms_enabled === false) return false
  return true
}

/** KTL admins always; else org license must enable RailNet. Org admins inherit org grant. */
export function canAccessRailnet(
  profile: Profile | null | undefined,
  license?: Pick<OrgLicense, 'railnet_enabled'> | null
): boolean {
  if (!profile) return false
  if (isKtlAdmin(profile)) return true
  if (!license || license.railnet_enabled !== true) return false
  if (isOrgAdmin(profile)) return true
  return profile.railnet_enabled === true
}

export function canAccessCompliance(
  profile: Profile | null | undefined,
  license?: Pick<OrgLicense, 'railnet_enabled' | 'compliance_enabled'> | null
): boolean {
  if (!profile) return false
  if (isKtlAdmin(profile)) return true
  if (!license || !license.railnet_enabled || !license.compliance_enabled) return false
  if (isOrgAdmin(profile)) return true
  return profile.railnet_enabled === true
}

export function canAccessCourseStaging(
  profile: Profile | null | undefined,
  license?: Pick<OrgLicense, 'plan' | 'lms_enabled' | 'railnet_enabled'> | null
): boolean {
  if (!profile) return false
  if (isKtlAdmin(profile)) return true
  if (!isOrgAdmin(profile)) return false
  if (!license) return false
  return (
    license.plan === 'both' &&
    license.lms_enabled !== false &&
    license.railnet_enabled === true
  )
}

/** Org-level paid phishing add-on (org admins only; KTL admins always). */
export function canAccessPhishing(
  profile: Profile | null | undefined,
  license?: Pick<OrgLicense, 'phishing_enabled'> | null
): boolean {
  if (!profile) return false
  if (isKtlAdmin(profile)) return true
  if (!isOrgAdmin(profile)) return false
  return license?.phishing_enabled === true
}

export async function fetchOrgLicense(orgId: string): Promise<OrgLicense | null> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('org_license')
    .select(
      'org_id, railnet_enabled, compliance_enabled, lms_enabled, phishing_enabled, plan, max_seats, updated_at'
    )
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    ...data,
    lms_enabled: data.lms_enabled !== false,
    phishing_enabled: data.phishing_enabled === true,
    plan: (data.plan as OrgPlan) || 'lms',
  }
}

export type OrgLicenseEntitlementPatch = {
  lms_enabled?: boolean
  railnet_enabled?: boolean
  compliance_enabled?: boolean
  phishing_enabled?: boolean
  plan?: OrgPlan
}

/** KTL admin: set paid feature flags for an organization. */
export async function updateOrgLicenseEntitlements(
  orgId: string,
  patch: OrgLicenseEntitlementPatch
): Promise<OrgLicense> {
  const supabase = requireSupabase()
  const existing = await fetchOrgLicense(orgId)
  const next = {
    org_id: orgId,
    lms_enabled: patch.lms_enabled ?? existing?.lms_enabled ?? true,
    railnet_enabled: patch.railnet_enabled ?? existing?.railnet_enabled ?? false,
    compliance_enabled: patch.compliance_enabled ?? existing?.compliance_enabled ?? false,
    phishing_enabled: patch.phishing_enabled ?? existing?.phishing_enabled ?? false,
    plan: patch.plan ?? existing?.plan ?? 'lms',
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('org_license')
    .upsert(next, { onConflict: 'org_id' })
    .select(
      'org_id, railnet_enabled, compliance_enabled, lms_enabled, phishing_enabled, plan, max_seats, updated_at'
    )
    .eq('org_id', orgId)
    .single()

  if (error) throw new Error(error.message)

  const existingTerms = await fetchOrgBillingTerms(orgId)
  if (!existingTerms) {
    await ensureOrgBillingTerms(orgId, next.plan)
  } else if (patch.plan && patch.plan !== existingTerms.plan) {
    const { error: termsError } = await supabase
      .from('org_billing_terms')
      .update({ plan: patch.plan, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
    if (termsError) throw new Error(termsError.message)
  }

  return {
    ...data,
    lms_enabled: data.lms_enabled !== false,
    phishing_enabled: data.phishing_enabled === true,
    plan: (data.plan as OrgPlan) || 'lms',
  }
}

export async function fetchOrgBillingTerms(orgId: string): Promise<OrgBillingTerms | null> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('org_billing_terms')
    .select(
      'org_id, plan, plan_base_cents, org_admin_cents, manager_cents, employee_cents, locked_at'
    )
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as OrgBillingTerms | null
}

/** Ensure billing terms exist (KTL admin / service). Uses catalog snapshot. */
export async function ensureOrgBillingTerms(
  orgId: string,
  plan: OrgPlan = 'both'
): Promise<OrgBillingTerms> {
  const existing = await fetchOrgBillingTerms(orgId)
  if (existing) return existing

  const supabase = requireSupabase()
  const catalog = catalogTermsForPlan(plan)
  const row = {
    org_id: orgId,
    ...catalog,
    locked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('org_billing_terms')
    .upsert(row, { onConflict: 'org_id', ignoreDuplicates: true })
    .select(
      'org_id, plan, plan_base_cents, org_admin_cents, manager_cents, employee_cents, locked_at'
    )
    .eq('org_id', orgId)
    .single()

  if (error) throw new Error(error.message)
  return data as OrgBillingTerms
}

export async function setOrgPlanAsAdmin(orgId: string, plan: OrgPlan): Promise<void> {
  const entitlements = entitlementsForPlan(plan)
  const existing = await fetchOrgLicense(orgId)
  await updateOrgLicenseEntitlements(orgId, {
    plan,
    ...entitlements,
    // Plan SKU does not imply phishing; keep existing add-on state
    phishing_enabled: existing?.phishing_enabled === true,
  })
}
