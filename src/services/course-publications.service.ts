import { backend } from '@/backend'

export async function fetchPublicationsForOrg(orgId: string) {
  return backend.courses.fetchPublicationsForOrg(orgId)
}

export async function fetchPublicationsForCourse(courseId: string) {
  return backend.courses.fetchPublicationsForCourse(courseId)
}

export async function publishCourseToOrg(payload: {
  courseId: string
  orgId: string
  publishedBy: string
  availableDays?: number | null
}) {
  return backend.courses.publishCourseToOrg(payload)
}

export async function unpublishCourseFromOrg(courseId: string, orgId: string) {
  return backend.courses.unpublishCourseFromOrg(courseId, orgId)
}

export async function unpublishCourseEverywhere(courseId: string) {
  return backend.courses.unpublishCourseEverywhere(courseId)
}

export async function setCourseAvailability(
  courseId: string,
  orgId: string,
  availableDays: number | null
) {
  return backend.courses.setCourseAvailability(courseId, orgId, availableDays)
}

export async function fetchUnacknowledgedNotices(userId: string, orgId: string) {
  return backend.courses.fetchUnacknowledgedNotices(userId, orgId)
}

export async function acknowledgeCourseNotice(publicationId: string, userId: string) {
  return backend.courses.acknowledgeCourseNotice(publicationId, userId)
}
