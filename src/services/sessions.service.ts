import { backend } from '@/backend'
import type { ModuleAttempt, TrainingSession } from '@/types/course.types'

export async function startSession(
  assignmentId: string,
  userId: string,
  courseId: string
): Promise<TrainingSession> {
  return backend.training.startSession(assignmentId, userId, courseId)
}

export async function updateSessionTime(sessionId: string, seconds: number) {
  return backend.training.updateSessionTime(sessionId, seconds)
}

export async function completeSession(
  sessionId: string,
  payload: { score: number; passed: boolean; time_spent_seconds: number }
) {
  return backend.training.completeSession(sessionId, payload)
}

export async function saveModuleAttempt(
  attempt: Partial<ModuleAttempt> & { session_id: string; module_id: string; user_id: string }
) {
  return backend.training.saveModuleAttempt(attempt)
}

export async function fetchSessions(userId?: string): Promise<TrainingSession[]> {
  return backend.training.fetchSessions(userId)
}

export async function fetchOrgModuleAttempts(orgId: string) {
  return backend.training.fetchOrgModuleAttempts(orgId)
}

export async function fetchUserModuleAttempts(userId: string) {
  return backend.training.fetchUserModuleAttempts(userId)
}
