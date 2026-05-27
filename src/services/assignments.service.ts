import { backend } from '@/backend'
import type { Assignment, AssignmentStatus } from '@/types/course.types'

export async function fetchAssignments(userId?: string): Promise<Assignment[]> {
  return backend.assignments.fetchAssignments(userId)
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
