import type { Course, CoursePublication } from '@/types/course.types'

export function isPublicationActive(pub: CoursePublication): boolean {
  if (pub.unpublished_at) return false
  if (new Date(pub.published_at) > new Date()) return false
  if (pub.available_until && new Date(pub.available_until) <= new Date()) return false
  return true
}

export function activePublicationCourseIds(publications: CoursePublication[]): Set<string> {
  return new Set(publications.filter(isPublicationActive).map((p) => p.course_id))
}

/** True when the course has an active publication for the given org (not the global is_published flag). */
export function isCoursePublishedToOrg(
  course: Course,
  orgId: string,
  publications: CoursePublication[] = []
): boolean {
  if (course.publication?.org_id === orgId && isPublicationActive(course.publication)) {
    return true
  }
  return publications.some(
    (p) => p.course_id === course.id && p.org_id === orgId && isPublicationActive(p)
  )
}

export function courseStatusLabelForOrg(
  course: Course,
  orgId: string,
  publications: CoursePublication[] = []
): 'Published' | 'Draft' {
  return isCoursePublishedToOrg(course, orgId, publications) ? 'Published' : 'Draft'
}
