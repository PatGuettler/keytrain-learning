import { backend } from '@/backend'
import type { Assignment, AssignmentStatus } from '@/types/course.types'

export async function fetchAssignments(userId?: string): Promise<Assignment[]> {
  return backend.assignments.fetchAssignments(userId)
}

/** Ensures the user has assignments for every active published course in their org. */
export async function syncRequiredAssignmentsForUser(userId: string): Promise<void> {
  return backend.assignments.syncRequiredAssignmentsForUser(userId)
}

export async function fetchAssignmentsForOrg(orgId: string): Promise<Assignment[]> {
  return backend.assignments.fetchAssignments({ orgId })
}

export async function fetchAllAssignments(): Promise<Assignment[]> {
  return backend.assignments.fetchAssignments()
}

export async function createAssignment(payload: {
  course_id: string
  user_id: string
  assigned_by: string
  due_date?: string
}) {
  return backend.assignments.createAssignment(payload)
}

export async function updateAssignment(
  id: string,
  patch: Partial<{ status: AssignmentStatus; force_retake: boolean; due_date: string | null }>
) {
  return backend.assignments.updateAssignment(id, patch)
}

export async function deleteAssignment(id: string) {
  return backend.assignments.deleteAssignment(id)
}
