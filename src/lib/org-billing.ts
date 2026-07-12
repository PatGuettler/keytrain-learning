import type { Profile, UserRole } from '@/types/user.types'
import {
  type BillableRole,
  type OrgBillingTerms,
  type OrgPlan,
  ROLE_SEAT_LABELS,
  formatUsdFromCents,
} from '@/lib/seat-pricing'

export type SeatCounts = Record<BillableRole, number>

export interface BillLineItem {
  key: string
  label: string
  quantity: number
  unitCents: number
  subtotalCents: number
}

export interface OrgBillSnapshot {
  plan: OrgPlan
  planBaseCents: number
  seatCounts: SeatCounts
  lineItems: BillLineItem[]
  seatsSubtotalCents: number
  monthlyTotalCents: number
  lockedAt?: string
}

const BILLABLE: BillableRole[] = ['org_admin', 'manager', 'employee']

export function isBillableRole(role: UserRole | string): role is BillableRole {
  return role === 'org_admin' || role === 'manager' || role === 'employee'
}

export function countSeats(profiles: Pick<Profile, 'role' | 'is_active'>[]): SeatCounts {
  const counts: SeatCounts = { org_admin: 0, manager: 0, employee: 0 }
  for (const p of profiles) {
    if (!p.is_active) continue
    if (isBillableRole(p.role)) counts[p.role] += 1
  }
  return counts
}

export function seatUnitCents(terms: Pick<OrgBillingTerms, 'org_admin_cents' | 'manager_cents' | 'employee_cents'>, role: BillableRole): number {
  if (role === 'org_admin') return terms.org_admin_cents
  if (role === 'manager') return terms.manager_cents
  return terms.employee_cents
}

export function computeOrgBill(
  terms: Pick<OrgBillingTerms, 'plan' | 'plan_base_cents' | 'org_admin_cents' | 'manager_cents' | 'employee_cents' | 'locked_at'>,
  profiles: Pick<Profile, 'role' | 'is_active'>[]
): OrgBillSnapshot {
  const seatCounts = countSeats(profiles)
  const lineItems: BillLineItem[] = [
    {
      key: 'plan_base',
      label: `Plan base`,
      quantity: 1,
      unitCents: terms.plan_base_cents,
      subtotalCents: terms.plan_base_cents,
    },
  ]

  let seatsSubtotalCents = 0
  for (const role of BILLABLE) {
    const quantity = seatCounts[role]
    if (quantity === 0) continue
    const unitCents = seatUnitCents(terms, role)
    const subtotalCents = quantity * unitCents
    seatsSubtotalCents += subtotalCents
    lineItems.push({
      key: role,
      label: ROLE_SEAT_LABELS[role],
      quantity,
      unitCents,
      subtotalCents,
    })
  }

  return {
    plan: terms.plan,
    planBaseCents: terms.plan_base_cents,
    seatCounts,
    lineItems,
    seatsSubtotalCents,
    monthlyTotalCents: terms.plan_base_cents + seatsSubtotalCents,
    lockedAt: terms.locked_at,
  }
}

/** Preview bill after applying seat deltas (role adds / swaps / deactivates). */
export function previewSeatDelta(
  terms: Pick<OrgBillingTerms, 'plan' | 'plan_base_cents' | 'org_admin_cents' | 'manager_cents' | 'employee_cents' | 'locked_at'>,
  currentProfiles: Pick<Profile, 'id' | 'role' | 'is_active'>[],
  options: {
    /** New users to add (not yet in currentProfiles). */
    additions?: { role: BillableRole; count?: number }[]
    /** Replace one user's role / active flag for preview. */
    replaceUser?: { id: string; role: UserRole; is_active: boolean }
  } = {}
): { current: OrgBillSnapshot; next: OrgBillSnapshot; deltaCents: number } {
  const current = computeOrgBill(terms, currentProfiles)

  const nextProfiles = currentProfiles.map((p) => {
    if (options.replaceUser && p.id === options.replaceUser.id) {
      return { ...p, role: options.replaceUser.role, is_active: options.replaceUser.is_active }
    }
    return p
  })

  for (const add of options.additions ?? []) {
    const n = add.count ?? 1
    for (let i = 0; i < n; i++) {
      nextProfiles.push({
        id: `preview-add-${add.role}-${i}`,
        role: add.role,
        is_active: true,
      } as Pick<Profile, 'id' | 'role' | 'is_active'>)
    }
  }

  const next = computeOrgBill(terms, nextProfiles)
  return { current, next, deltaCents: next.monthlyTotalCents - current.monthlyTotalCents }
}

export function formatBillDelta(deltaCents: number): string {
  const abs = formatUsdFromCents(Math.abs(deltaCents))
  if (deltaCents > 0) return `increase by ${abs}`
  if (deltaCents < 0) return `decrease by ${abs}`
  return 'not change'
}
