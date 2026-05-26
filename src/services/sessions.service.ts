import { getSupabase, isSupabaseConfigured } from './supabase'
import { createDemoSession, updateDemoSession } from './demo-data'
import type { ModuleAttempt, TrainingSession } from '@/types/course.types'

export async function startSession(
  assignmentId: string,
  userId: string,
  courseId: string
): Promise<TrainingSession> {
  if (!isSupabaseConfigured) return createDemoSession(assignmentId, userId, courseId)
  const { data, error } = await getSupabase()!
    .from('training_sessions')
    .insert({ assignment_id: assignmentId, user_id: userId, course_id: courseId })
    .select()
    .single()
  if (error) throw error
  return data as TrainingSession
}

export async function updateSessionTime(sessionId: string, seconds: number) {
  if (!isSupabaseConfigured) {
    updateDemoSession(sessionId, { time_spent_seconds: seconds })
    return
  }
  await getSupabase()!.from('training_sessions').update({ time_spent_seconds: seconds }).eq('id', sessionId)
}

export async function completeSession(
  sessionId: string,
  payload: { score: number; passed: boolean; time_spent_seconds: number }
) {
  if (!isSupabaseConfigured) {
    updateDemoSession(sessionId, {
      ...payload,
      completed_at: new Date().toISOString(),
    })
    return
  }
  await getSupabase()!
    .from('training_sessions')
    .update({ ...payload, completed_at: new Date().toISOString() })
    .eq('id', sessionId)
}

export async function saveModuleAttempt(attempt: Partial<ModuleAttempt> & { session_id: string; module_id: string; user_id: string }) {
  if (!isSupabaseConfigured) return attempt as ModuleAttempt
  const supabase = getSupabase()!
  if (attempt.id) {
    const { data, error } = await supabase.from('module_attempts').update(attempt).eq('id', attempt.id).select().single()
    if (error) throw error
    return data as ModuleAttempt
  }
  const { data, error } = await supabase.from('module_attempts').insert(attempt).select().single()
  if (error) throw error
  return data as ModuleAttempt
}

export async function fetchSessions(userId?: string): Promise<TrainingSession[]> {
  if (!isSupabaseConfigured) return []
  let q = getSupabase()!.from('training_sessions').select('*')
  if (userId) q = q.eq('user_id', userId)
  const { data, error } = await q.order('started_at', { ascending: false })
  if (error) throw error
  return data as TrainingSession[]
}
