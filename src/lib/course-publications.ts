import type { CoursePublication } from '@/types/course.types'

export function isPublicationActive(pub: CoursePublication): boolean {
  if (pub.unpublished_at) return false
  if (new Date(pub.published_at) > new Date()) return false
  if (pub.available_until && new Date(pub.available_until) <= new Date()) return false
  return true
}

export function activePublicationCourseIds(publications: CoursePublication[]): Set<string> {
  return new Set(publications.filter(isPublicationActive).map((p) => p.course_id))
}
