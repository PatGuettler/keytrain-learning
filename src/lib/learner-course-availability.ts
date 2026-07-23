import type { AssignmentStatus } from '@/types/course.types'

export type CatalogAvailability = 'available' | 'closed'
export type AvailabilityFilter = 'all' | CatalogAvailability

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

/** User-facing availability label (replaces Published / Unpublished). */
export function learnerAvailabilityLabel(
  catalog: CatalogAvailability,
  status: AssignmentStatus
): string {
  if (catalog === 'available') return 'Available'
  const detail = resolveClosedDetail(status)
  if (detail === 'completed') return 'Completed'
  if (detail === 'expired') return 'Expired'
  return 'Closed'
}

export function learnerAvailabilityVariant(
  catalog: CatalogAvailability,
  status: AssignmentStatus
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  if (catalog === 'available') return 'success'
  const detail = resolveClosedDetail(status)
  if (detail === 'completed') return 'success'
  if (detail === 'expired') return 'destructive'
  return 'secondary'
}

export function matchesAvailabilityFilter(
  catalog: CatalogAvailability,
  filter: AvailabilityFilter
): boolean {
  if (filter === 'all') return true
  return catalog === filter
}
