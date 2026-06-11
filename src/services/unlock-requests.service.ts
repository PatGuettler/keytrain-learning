import { backend } from '@/backend'
import type { CourseUnlockRequest, UnlockRequestStatus } from '@/types/course.types'

export async function recordCourseAttemptResult(
  assignmentId: string,
  passed: boolean,
  maxAttempts: number
) {
  return backend.assignments.recordCourseAttemptResult(assignmentId, passed, maxAttempts)
}

export async function requestCourseUnlock(payload: {
  assignmentId: string
  userId: string
  courseId: string
  orgId: string
  message?: string
}) {
  return backend.assignments.requestCourseUnlock(payload)
}

export async function fetchUnlockRequests(status?: UnlockRequestStatus) {
  return backend.assignments.fetchUnlockRequests(status)
}

export async function resolveUnlockRequest(requestId: string, approved: boolean, adminId: string) {
  return backend.assignments.resolveUnlockRequest(requestId, approved, adminId)
}

export async function fetchPendingUnlockForAssignment(
  assignmentId: string,
  userId: string
): Promise<CourseUnlockRequest | null> {
  return backend.assignments.fetchPendingUnlockForAssignment(assignmentId, userId)
}
