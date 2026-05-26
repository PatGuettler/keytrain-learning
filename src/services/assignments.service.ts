import { getSupabase, isSupabaseConfigured } from './supabase'
import { getDemoAssignments, upsertDemoAssignment } from './demo-data'
import type { Assignment, AssignmentStatus } from '@/types/course.types'

export async function fetchAssignments(userId?: string): Promise<Assignment[]> {
  if (!isSupabaseConfigured) return getDemoAssignments(userId)
  const supabase = getSupabase()!
  let q = supabase.from('assignments').select('*, course:courses(*)')
  if (userId) q = q.eq('user_id', userId)
  const { data, error } = await q.order('assigned_at', { ascending: false })
  if (error) throw error
  return data as Assignment[]
}

export async function createAssignment(payload: {
  course_id: string
  user_id: string
  assigned_by: string
  due_date?: string
}) {
  if (!isSupabaseConfigured) {
    const a: Assignment = {
      id: crypto.randomUUID(),
      ...payload,
      assigned_by: payload.assigned_by,
      assigned_at: new Date().toISOString(),
      due_date: payload.due_date ?? null,
      status: 'pending',
      force_retake: false,
    }
    upsertDemoAssignment(a)
    return a
  }
  const { data, error } = await getSupabase()!
    .from('assignments')
    .insert({ ...payload, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data as Assignment
}

export async function updateAssignment(
  id: string,
  patch: Partial<{ status: AssignmentStatus; force_retake: boolean; due_date: string | null }>
) {
  if (!isSupabaseConfigured) {
    const list = getDemoAssignments()
    const a = list.find((x) => x.id === id)
    if (a) upsertDemoAssignment({ ...a, ...patch })
    return a
  }
  const { data, error } = await getSupabase()!.from('assignments').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Assignment
}

export async function deleteAssignment(id: string) {
  if (!isSupabaseConfigured) return
  await getSupabase()!.from('assignments').delete().eq('id', id)
}
