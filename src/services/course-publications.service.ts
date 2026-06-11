import { backend } from '@/backend'
import type { CoursePublication, CoursePublicationNotice } from '@/types/course.types'

export async function fetchPublicationsForCourse(courseId: string): Promise<CoursePublication[]> {
  return backend.courses.fetchPublicationsForCourse(courseId)
}

export async function publishCourseToOrg(payload: {
  courseId: string
  orgId: string
  publishedBy: string
  availableDays?: number | null
}): Promise<CoursePublication> {
  return backend.courses.publishCourseToOrg(payload)
}

export async function unpublishCourseFromOrg(courseId: string, orgId: string): Promise<void> {
  return backend.courses.unpublishCourseFromOrg(courseId, orgId)
}

export async function unpublishCourseEverywhere(courseId: string): Promise<void> {
  return backend.courses.unpublishCourseEverywhere(courseId)
}

export async function setCourseAvailability(
  courseId: string,
  orgId: string,
  availableDays: number | null
): Promise<CoursePublication> {
  return backend.courses.setCourseAvailability(courseId, orgId, availableDays)
}

export async function fetchUnacknowledgedNotices(
  userId: string,
  orgId: string
): Promise<CoursePublicationNotice[]> {
  return backend.courses.fetchUnacknowledgedNotices(userId, orgId)
}

export async function acknowledgeCourseNotice(publicationId: string, userId: string): Promise<void> {
  return backend.courses.acknowledgeCourseNotice(publicationId, userId)
}
