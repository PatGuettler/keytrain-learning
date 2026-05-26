export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: Partial<{ name: string }>
      }
      profiles: {
        Row: {
          id: string
          org_id: string
          manager_id: string | null
          full_name: string
          role: 'admin' | 'manager' | 'employee'
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          org_id: string
          manager_id?: string | null
          full_name: string
          role?: 'admin' | 'manager' | 'employee'
          avatar_url?: string | null
          is_active?: boolean
        }
        Update: Partial<{
          full_name: string
          avatar_url: string | null
          is_active: boolean
          manager_id: string | null
        }>
      }
      courses: {
        Row: {
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
        }
      }
      modules: {
        Row: {
          id: string
          course_id: string
          title: string
          type: 'lesson' | 'quiz' | 'workshop'
          order_index: number
          content: Json
          created_at: string
        }
      }
      assignments: {
        Row: {
          id: string
          course_id: string
          user_id: string
          assigned_by: string | null
          assigned_at: string
          due_date: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'overdue'
          force_retake: boolean
        }
      }
      training_sessions: {
        Row: {
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
      }
      module_attempts: {
        Row: {
          id: string
          session_id: string
          module_id: string
          user_id: string
          started_at: string
          completed_at: string | null
          time_spent_seconds: number
          score: number | null
          answers: Json | null
          interactions: Json | null
        }
      }
    }
  }
}
