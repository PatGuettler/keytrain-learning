import { backend } from '@/backend'
import type { UnlockRequestStatus } from '@/types/course.types'

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

export async function fetchUnlockRequestsForAssignment(assignmentId: string) {
  return backend.assignments.fetchUnlockRequestsForAssignment(assignmentId)
}

export async function fetchPendingUnlockForAssignment(assignmentId: string, userId: string) {
  return backend.assignments.fetchPendingUnlockForAssignment(assignmentId, userId)
}

export async function resolveUnlockRequest(requestId: string, approved: boolean, adminId: string) {
  return backend.assignments.resolveUnlockRequest(requestId, approved, adminId)
}
