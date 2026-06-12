import { isPublicationActive } from '@/lib/course-publications'
import { resolveAttemptsUsed } from '@/lib/dashboard-stats'
import { getSupabase } from '@/services/supabase'
import type { Assignment, CoursePublication, Module, ModuleAttempt, TrainingSession } from '@/types/course.types'
import type { Database, Json } from '@/types/database.types'

export type CourseInsert = Database['public']['Tables']['courses']['Insert']
export type CourseUpdate = Database['public']['Tables']['courses']['Update']
export type ModuleInsert = Database['public']['Tables']['modules']['Insert']
export type ModuleUpdate = Database['public']['Tables']['modules']['Update']
export type ModuleAttemptUpdate = Database['public']['Tables']['module_attempts']['Update']

type ModuleAttemptInsert = Database['public']['Tables']['module_attempts']['Insert']

export async function syncCoursePublishedFlag(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  courseId: string
) {
  const { data: publications, error } = await supabase
    .from('course_publications')
    .select('published_at, available_until, unpublished_at')
    .eq('course_id', courseId)
  if (error) throw error

  const hasActive = (publications ?? []).some((row) =>
    isPublicationActive(row as CoursePublication)
  )
  const { error: updateError } = await supabase
    .from('courses')
    .update({ is_published: hasActive })
    .eq('id', courseId)
  if (updateError) throw updateError
}

export function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

export function enrichAssignment(
  row: Assignment & { training_sessions?: TrainingSession[] }
): Assignment {
  const sessions = row.training_sessions ?? []
  let lastScore = row.last_score != null ? Math.round(Number(row.last_score)) : null

  if (lastScore == null && sessions.length > 0) {
    const completed = sessions
      .filter((s) => s.completed_at && s.score != null)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    if (completed.length > 0) {
      const best = completed.find((s) => s.passed) ?? completed[0]
      lastScore = Math.round(Number(best.score))
    }
  }

  const enriched = { ...row, training_sessions: sessions.length > 0 ? sessions : undefined }
  const attemptsUsed = resolveAttemptsUsed(enriched as Assignment)

  const { training_sessions: _sessions, ...rest } = row
  return {
    ...rest,
    attempts_used: attemptsUsed,
    last_score: lastScore,
    training_sessions: sessions.length > 0 ? sessions : undefined,
  }
}

export function toDueDate(availableUntil: string | null): string | undefined {
  if (!availableUntil) return undefined
  return availableUntil.split('T')[0]
}

export function toModuleInsert(
  module: Partial<Module> & { course_id: string; title: string; type: Module['type'] }
): ModuleInsert {
  const { content, ...rest } = module
  return { ...rest, content: content as Json | undefined }
}

export function toAttemptRow(
  attempt: Partial<ModuleAttempt> & { session_id: string; module_id: string; user_id: string }
): ModuleAttemptInsert {
  const { answers, interactions, ...rest } = attempt
  return {
    ...rest,
    answers: answers as Json | null | undefined,
    interactions: interactions as Json | null | undefined,
  }
}
