import type { AssignmentStatus } from '@/types/course.types'

export type CatalogAvailability = 'available' | 'closed'
export type AvailabilityFilter = 'all' | CatalogAvailability

/** Display status when catalog availability affects how progress reads. */
export type EffectiveProgressStatus = AssignmentStatus | 'incomplete' | 'expired'

export function resolveCatalogAvailability(
  courseId: string,
  activeCourseIds: Set<string>
): CatalogAvailability {
  return activeCourseIds.has(courseId) ? 'available' : 'closed'
}

/** How a closed course relates to the learner's progress. */
export function resolveClosedDetail(status: AssignmentStatus): 'completed' | 'expired' | 'incomplete' {
  if (status === 'completed') return 'completed'
  if (status === 'overdue') return 'expired'
  return 'incomplete'
}

/**
 * Progress label shown to learners when a course may have closed (unpublished / expired).
 * Raw DB status stays pending/in_progress; display becomes Incomplete or Expired.
 */
export function resolveEffectiveProgressStatus(
  catalog: CatalogAvailability,
  status: AssignmentStatus
): EffectiveProgressStatus {
  if (catalog === 'available') return status
  if (status === 'completed') return 'completed'
  if (status === 'overdue') return 'expired'
  return 'incomplete'
}

const EFFECTIVE_PROGRESS_LABELS: Record<EffectiveProgressStatus, string> = {
  pending: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  overdue: 'Overdue',
  incomplete: 'Incomplete',
  expired: 'Expired',
}

export function assignmentProgressLabel(
  courseId: string,
  status: AssignmentStatus,
  activeCourseIds: Set<string>
): string {
  const catalog = resolveCatalogAvailability(courseId, activeCourseIds)
  return effectiveProgressLabel(resolveEffectiveProgressStatus(catalog, status))
}

export function effectiveProgressLabel(status: EffectiveProgressStatus): string {
  return EFFECTIVE_PROGRESS_LABELS[status]
}

export function effectiveProgressVariant(
  status: EffectiveProgressStatus
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'completed':
      return 'success'
    case 'in_progress':
      return 'default'
    case 'overdue':
    case 'expired':
      return 'destructive'
    case 'incomplete':
      return 'warning'
    default:
      return 'secondary'
  }
}

/** User-facing availability label (replaces Published / Unpublished). */
export function learnerAvailabilityLabel(
  catalog: CatalogAvailability,
  status: AssignmentStatus
): string {
  if (catalog === 'available') return 'Available'
  const detail = resolveClosedDetail(status)
  if (detail === 'completed') return 'Completed'
  if (detail === 'expired') return 'Expired'
  return 'Incomplete'
}

export function learnerAvailabilityVariant(
  catalog: CatalogAvailability,
  status: AssignmentStatus
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  if (catalog === 'available') return 'success'
  const detail = resolveClosedDetail(status)
  if (detail === 'completed') return 'success'
  if (detail === 'expired') return 'destructive'
  if (detail === 'incomplete') return 'warning'
  return 'secondary'
}

export function matchesAvailabilityFilter(
  catalog: CatalogAvailability,
  filter: AvailabilityFilter
): boolean {
  if (filter === 'all') return true
  return catalog === filter
}
