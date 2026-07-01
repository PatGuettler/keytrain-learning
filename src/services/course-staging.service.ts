import { getSupabase } from '@/services/supabase'
import type { CourseExportBundle } from '@/lib/course-export'
import { parseCourseImport } from '@/lib/course-export'
import { PLATFORM_ORG_ID } from '@/lib/constants'
import { upsertCourse, upsertModule } from '@/services/courses.service'
import type { CourseStagingRow } from '@/types/hive-staging.types'

function requireSupabase() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export async function fetchCourseStagingRows(): Promise<CourseStagingRow[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('course_staging' as 'courses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as CourseStagingRow[]
}

export async function createCourseStagingRow(input: {
  hive_org_id: string
  source_assignment_sk?: string
  source_trend_report_sk?: string
  title: string
  proposed_content: CourseExportBundle
  created_by: string
}): Promise<CourseStagingRow> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('course_staging' as 'courses')
    .insert({
      hive_org_id: input.hive_org_id,
      source_assignment_sk: input.source_assignment_sk ?? null,
      source_trend_report_sk: input.source_trend_report_sk ?? null,
      title: input.title,
      proposed_content: input.proposed_content,
      created_by: input.created_by,
      status: 'pending_review',
    } as never)
    .select('*')
    .single()
  if (error) throw error
  return data as unknown as CourseStagingRow
}

export async function updateCourseStagingContent(
  id: string,
  proposed_content: CourseExportBundle
): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('course_staging' as 'courses')
    .update({
      proposed_content,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)
  if (error) throw error
}

export async function publishStagedCourse(
  stagingId: string,
  userId: string
): Promise<{ courseId: string }> {
  const supabase = requireSupabase()
  const { data: row, error } = await supabase
    .from('course_staging' as 'courses')
    .select('*')
    .eq('id', stagingId)
    .single()
  if (error) throw error

  const staging = row as unknown as CourseStagingRow
  const draft = parseCourseImport(staging.proposed_content)

  const course = await upsertCourse({
    org_id: PLATFORM_ORG_ID,
    title: draft.title,
    description: draft.description,
    estimated_minutes: draft.estimated_minutes,
    max_attempts: draft.max_attempts,
    show_results_after_completion: draft.show_results_after_completion,
    is_published: false,
    created_by: userId,
  })

  for (const mod of draft.modules) {
    await upsertModule({
      course_id: course.id,
      title: mod.title,
      type: mod.type,
      order_index: mod.order_index,
      content: mod.content,
    })
  }

  const { error: updateError } = await supabase
    .from('course_staging' as 'courses')
    .update({
      status: 'published',
      published_course_id: course.id,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', stagingId)
  if (updateError) throw updateError

  return { courseId: course.id }
}

export async function rejectStagedCourse(stagingId: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('course_staging' as 'courses')
    .update({ status: 'rejected', updated_at: new Date().toISOString() } as never)
    .eq('id', stagingId)
  if (error) throw error
}
