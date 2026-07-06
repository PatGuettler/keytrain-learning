export type CourseStagingStatus = 'pending_review' | 'published' | 'rejected'

export type CourseStagingRow = {
  id: string
  railnet_org_id: string
  source_assignment_sk: string | null
  source_trend_report_sk: string | null
  title: string
  status: CourseStagingStatus
  proposed_content: Record<string, unknown>
  published_course_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
