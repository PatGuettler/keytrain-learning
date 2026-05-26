import { getSupabase, isSupabaseConfigured } from './supabase'
import { createDemoSession, saveDemoModuleAttempt, updateDemoSession } from './demo-data'
import type { ModuleAttempt, TrainingSession } from '@/types/course.types'
import type { Database, Json } from '@/types/database.types'

type ModuleAttemptInsert = Database['public']['Tables']['module_attempts']['Insert']
type ModuleAttemptUpdate = Database['public']['Tables']['module_attempts']['Update']

function toAttemptRow(
  attempt: Partial<ModuleAttempt> & { session_id: string; module_id: string; user_id: string }
): ModuleAttemptInsert {
  const { answers, interactions, ...rest } = attempt
  return {
    ...rest,
    answers: answers as Json | null | undefined,
    interactions: interactions as Json | null | undefined,
  }
}

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

export async function saveModuleAttempt(
  attempt: Partial<ModuleAttempt> & { session_id: string; module_id: string; user_id: string }
) {
  if (!isSupabaseConfigured) {
    return saveDemoModuleAttempt({
      session_id: attempt.session_id,
      module_id: attempt.module_id,
      user_id: attempt.user_id,
      started_at: attempt.started_at,
      completed_at: attempt.completed_at ?? new Date().toISOString(),
      time_spent_seconds: attempt.time_spent_seconds ?? 0,
      score: attempt.score ?? null,
      answers: attempt.answers ?? null,
      interactions: attempt.interactions ?? null,
      id: attempt.id,
    })
  }
  const supabase = getSupabase()!
  const row = toAttemptRow(attempt)
  if (attempt.id) {
    const { data, error } = await supabase
      .from('module_attempts')
      .update(row as ModuleAttemptUpdate)
      .eq('id', attempt.id)
      .select()
      .single()
    if (error) throw error
    return data as ModuleAttempt
  }
  const { data, error } = await supabase.from('module_attempts').insert(row).select().single()
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
