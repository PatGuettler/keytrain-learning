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
  course?: Course
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
}

export interface LessonSlide {
  id: string
  heading: string
  body: string
  layout?: 'image-right' | 'image-left' | 'image-top' | 'full-bleed'
  illustration?: {
    /** Remote image URL (Supabase Storage, etc.) */
    url?: string
    /** Built-in SVG illustration id when url is empty */
    key?: string
    alt: string
    caption?: string
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
