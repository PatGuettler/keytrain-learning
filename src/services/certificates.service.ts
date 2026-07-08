import { getSupabase } from '@/services/supabase'
import type { Certificate } from '@/types/course.types'

type CertificateRow = {
  id: string
  user_id: string
  course_id: string
  assignment_id: string | null
  issued_at: string
  expires_at: string | null
}

async function attachCourseTitles(rows: CertificateRow[]): Promise<Certificate[]> {
  if (rows.length === 0) return []
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend not configured.')

  const courseIds = [...new Set(rows.map((r) => r.course_id))]
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title')
    .in('id', courseIds)
  if (error) throw error

  const byId = new Map((courses ?? []).map((c) => [c.id, c]))
  return rows.map((row) => ({
    ...row,
    course: byId.get(row.course_id),
  }))
}

export async function issueCertificateForAssignment(
  assignmentId: string,
  userId: string
): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend not configured.')
  const { data, error } = await supabase.rpc('issue_course_certificate', {
    p_assignment_id: assignmentId,
    p_user_id: userId,
  })
  if (error) throw error
  return (data as string | null) ?? null
}

export async function fetchCertificateForCourse(
  userId: string,
  courseId: string
): Promise<Certificate | null> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend not configured.')
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const [withTitle] = await attachCourseTitles([data as CertificateRow])
  return withTitle ?? null
}

export async function fetchUserCertificates(userId: string): Promise<Certificate[]> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend not configured.')
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false })
  if (error) throw error
  return attachCourseTitles((data ?? []) as CertificateRow[])
}
