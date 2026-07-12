import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/user.types'
import {
  type OrgBillingTerms,
  type OrgPlan,
  catalogTermsForPlan,
  entitlementsForPlan,
} from '@/lib/seat-pricing'

export interface OrgLicense {
  org_id: string
  railnet_enabled: boolean
  compliance_enabled: boolean
  lms_enabled: boolean
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

/** KTL admins always; else org must have RailNet product and user grant (org_admin always granted). */
export function canAccessRailnet(
  profile: Profile | null | undefined,
  license?: Pick<OrgLicense, 'railnet_enabled'> | null
): boolean {
  if (!profile) return false
  if (isKtlAdmin(profile)) return true
  if (license && license.railnet_enabled === false) return false
  if (isOrgAdmin(profile)) return true
  return profile.railnet_enabled === true
}

export function canAccessCompliance(
  profile: Profile | null | undefined,
  license?: Pick<OrgLicense, 'railnet_enabled' | 'compliance_enabled'> | null
): boolean {
  if (!profile) return false
  if (isKtlAdmin(profile)) return true
  if (license) {
    if (!license.railnet_enabled || !license.compliance_enabled) return false
  }
  if (isOrgAdmin(profile)) return true
  return profile.railnet_enabled === true
}

export async function fetchOrgLicense(orgId: string): Promise<OrgLicense | null> {
  const { data, error } = await supabase
    .from('org_license')
    .select('org_id, railnet_enabled, compliance_enabled, lms_enabled, plan, max_seats, updated_at')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    ...data,
    lms_enabled: data.lms_enabled !== false,
    plan: (data.plan as OrgPlan) || 'both',
  }
}

export async function fetchOrgBillingTerms(orgId: string): Promise<OrgBillingTerms | null> {
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
  const { error: licenseError } = await supabase.from('org_license').upsert(
    {
      org_id: orgId,
      plan,
      ...entitlements,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' }
  )
  if (licenseError) throw new Error(licenseError.message)

  // Only insert billing terms if missing — do not overwrite grandfathered rates
  const existing = await fetchOrgBillingTerms(orgId)
  if (!existing) {
    await ensureOrgBillingTerms(orgId, plan)
  } else {
    // Plan change for existing org updates plan on license; base on locked terms stays until Stripe upgrade flow
    const { error } = await supabase
      .from('org_billing_terms')
      .update({ plan, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
    if (error) throw new Error(error.message)
  }
}
