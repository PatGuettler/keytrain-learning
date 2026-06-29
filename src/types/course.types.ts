import type { TrainingTag } from '@/types/training-tag.types'

export type ModuleType = 'lesson' | 'quiz' | 'workshop'
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'

export interface Course {
  id: string
  org_id: string
  title: string
  description: string
  thumbnail_url: string | null
  estimated_minutes: number
  is_published: boolean
  max_attempts: number
  tags?: TrainingTag[]
  created_by: string | null
  created_at: string
  updated_at: string
  /** Active publication for the viewer's org, when loaded via publish flow */
  publication?: CoursePublication | null
}

export interface CoursePublication {
  id: string
  course_id: string
  org_id: string
  published_at: string
  available_until: string | null
  unpublished_at: string | null
  published_by: string | null
  created_at: string
  course?: Course
}

export interface CoursePublicationNotice {
  publication: CoursePublication
  course: Course
}

export interface Module {
  id: string
  course_id: string
  title: string
  type: ModuleType
  order_index: number
  content: Record<string, unknown>
  created_at: string
}

export interface Assignment {
  id: string
  course_id: string
  user_id: string
  assigned_by: string | null
  assigned_at: string
  due_date: string | null
  status: AssignmentStatus
  force_retake: boolean
  attempts_used: number
  locked_at: string | null
  last_score: number | null
  completed_at: string | null
  course?: Course
  user?: { id: string; full_name: string; email: string | null }
  /** Populated when loading assignments with session history */
  training_sessions?: TrainingSession[]
}

export type UnlockRequestStatus = 'pending' | 'approved' | 'denied'

export interface CourseUnlockRequest {
  id: string
  assignment_id: string
  user_id: string
  course_id: string
  org_id: string
  status: UnlockRequestStatus
  message: string | null
  requested_at: string
  resolved_at: string | null
  resolved_by: string | null
  user?: { full_name: string; email: string | null }
  course?: { title: string }
  organization?: { name: string }
}

export interface TrainingSession {
  id: string
  assignment_id: string
  user_id: string
  course_id: string
  attempt_number: number
  started_at: string
  completed_at: string | null
  time_spent_seconds: number
  score: number | null
  passed: boolean | null
}

export interface ModuleAttempt {
  id: string
  session_id: string
  module_id: string
  user_id: string
  started_at: string
  completed_at: string | null
  time_spent_seconds: number
  score: number | null
  answers: Record<string, unknown> | null
  interactions: Record<string, unknown> | null
  user?: { full_name: string; email: string | null }
  module?: Pick<Module, 'id' | 'title' | 'type' | 'course_id' | 'content'>
}

export interface LessonSlide {
  id: string
  heading: string
  body: string
  layout?: 'image-right' | 'image-left' | 'image-top' | 'full-bleed' | 'image-only'
  illustration?: {
    /** Remote image URL (Supabase Storage, etc.) */
    url?: string
    /** Built-in SVG illustration id when url is empty */
    key?: string
    alt: string
    caption?: string
  }
  /** YouTube video to embed; learner must watch before advancing. */
  youtube?: {
    videoId: string
  }
}

export interface LessonContent {
  slides: LessonSlide[]
}

export interface QuizQuestion {
  id: string
  text: string
  type: 'single_select' | 'multi_select'
  options: { id: string; text: string; correct: boolean }[]
  explanation?: string
}

export interface QuizContent {
  passing_score: number
  randomize_questions?: boolean
  questions: QuizQuestion[]
}
