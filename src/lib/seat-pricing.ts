/** Catalog plan SKUs — base monthly fee + feature entitlements. */
export type OrgPlan = 'lms' | 'railnet' | 'both'

export type BillableRole = 'org_admin' | 'manager' | 'employee'

export interface SeatRatesCents {
  org_admin: number
  manager: number
  employee: number
}

export interface OrgBillingTerms {
  org_id: string
  plan: OrgPlan
  plan_base_cents: number
  org_admin_cents: number
  manager_cents: number
  employee_cents: number
  locked_at: string
}

/** Current public catalog (new signups). Existing orgs use locked org_billing_terms. */
export const CATALOG_PLAN_BASE_CENTS: Record<OrgPlan, number> = {
  /** KeyTrain Standard — LMS / training only ($60 includes up to 20 users) */
  lms: 6000,
  /** Legacy RailNet-only SKU (not shown on marketing; grandfathered orgs) */
  railnet: 2999,
  /** KeyTrain w/ Intelligence — custom quote */
  both: 2999,
}

/** Users included in KeyTrain Standard plan base (before additional-user fees). */
export const STANDARD_INCLUDED_USERS = 20

/** Per-user monthly rate after STANDARD_INCLUDED_USERS on KeyTrain Standard. */
export const CATALOG_ADDITIONAL_USER_CENTS = 220

/** Optional org-wide phishing simulations add-on (quote — not listed as fixed catalog price). */
export const CATALOG_PHISHING_ADDON_CENTS = 199

/** @deprecated Legacy role seat fees for grandfathered orgs only. */
export const CATALOG_SEAT_CENTS: SeatRatesCents = {
  org_admin: 1099,
  manager: 899,
  employee: 599,
}

export const PLAN_LABELS: Record<OrgPlan, string> = {
  lms: 'KeyTrain Standard',
  railnet: 'KeyTrain w/ Intelligence (RailNet only)',
  both: 'KeyTrain w/ Intelligence',
}

export const ROLE_SEAT_LABELS: Record<BillableRole, string> = {
  org_admin: 'Org admin',
  manager: 'Manager',
  employee: 'Employee',
}

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function catalogTermsForPlan(plan: OrgPlan): Omit<OrgBillingTerms, 'org_id' | 'locked_at'> {
  if (plan === 'lms') {
    return {
      plan,
      plan_base_cents: CATALOG_PLAN_BASE_CENTS.lms,
      org_admin_cents: 0,
      manager_cents: 0,
      employee_cents: CATALOG_ADDITIONAL_USER_CENTS,
    }
  }
  return {
    plan,
    plan_base_cents: CATALOG_PLAN_BASE_CENTS[plan],
    org_admin_cents: CATALOG_SEAT_CENTS.org_admin,
    manager_cents: CATALOG_SEAT_CENTS.manager,
    employee_cents: CATALOG_SEAT_CENTS.employee,
  }
}

export function entitlementsForPlan(plan: OrgPlan): {
  lms_enabled: boolean
  railnet_enabled: boolean
  compliance_enabled: boolean
} {
  return {
    lms_enabled: plan === 'lms' || plan === 'both',
    railnet_enabled: plan === 'railnet' || plan === 'both',
    compliance_enabled: plan === 'railnet' || plan === 'both',
  }
}

export const PAYMENT_STRUCTURE_COPY = {
  estimatedBanner: 'Estimated — payment collection via Stripe coming soon.',
  billingCycle:
    'Your monthly bill date is the day the organization subscription starts. You are charged that day each month for the plan base plus any users beyond the included allotment.',
  proration:
    'Users added mid-cycle are charged only for the remaining days in the billing period. Removals receive a prorated credit. The next renewal is a full month at the then-current headcount.',
  grandfathering:
    'Rates are locked for your organization at signup. Catalog price changes do not affect existing organizations.',
  multiOrgAdmin:
    'Each organization has its own subscription. An org admin who manages several orgs counts toward each org’s included user allotment — they are not billed a separate “org admin seat” fee on Standard.',
} as const
