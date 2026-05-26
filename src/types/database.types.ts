export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'
export type ModuleType = 'lesson' | 'quiz' | 'workshop'
export type UserRole = 'admin' | 'manager' | 'employee'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: Partial<{ name: string }>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          org_id: string
          manager_id: string | null
          full_name: string
          role: UserRole
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
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          org_id: string
          manager_id: string | null
          full_name: string
          role: UserRole
          avatar_url: string | null
          is_active: boolean
        }>
        Relationships: []
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
        Insert: {
          id?: string
          org_id: string
          title: string
          description?: string
          thumbnail_url?: string | null
          estimated_minutes?: number
          is_published?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          org_id: string
          title: string
          description: string
          thumbnail_url: string | null
          estimated_minutes: number
          is_published: boolean
          created_by: string | null
        }>
        Relationships: []
      }
      modules: {
        Row: {
          id: string
          course_id: string
          title: string
          type: ModuleType
          order_index: number
          content: Json
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          type: ModuleType
          order_index?: number
          content?: Json
          created_at?: string
        }
        Update: Partial<{
          course_id: string
          title: string
          type: ModuleType
          order_index: number
          content: Json
        }>
        Relationships: []
      }
      assignments: {
        Row: {
          id: string
          course_id: string
          user_id: string
          assigned_by: string | null
          assigned_at: string
          due_date: string | null
          status: AssignmentStatus
          force_retake: boolean
        }
        Insert: {
          id?: string
          course_id: string
          user_id: string
          assigned_by?: string | null
          assigned_at?: string
          due_date?: string | null
          status?: AssignmentStatus
          force_retake?: boolean
        }
        Update: Partial<{
          course_id: string
          user_id: string
          assigned_by: string | null
          due_date: string | null
          status: AssignmentStatus
          force_retake: boolean
        }>
        Relationships: []
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
        Insert: {
          id?: string
          assignment_id: string
          user_id: string
          course_id: string
          attempt_number?: number
          started_at?: string
          completed_at?: string | null
          time_spent_seconds?: number
          score?: number | null
          passed?: boolean | null
        }
        Update: Partial<{
          assignment_id: string
          user_id: string
          course_id: string
          attempt_number: number
          completed_at: string | null
          time_spent_seconds: number
          score: number | null
          passed: boolean | null
        }>
        Relationships: []
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
        Insert: {
          id?: string
          session_id: string
          module_id: string
          user_id: string
          started_at?: string
          completed_at?: string | null
          time_spent_seconds?: number
          score?: number | null
          answers?: Json | null
          interactions?: Json | null
        }
        Update: Partial<{
          session_id: string
          module_id: string
          user_id: string
          completed_at: string | null
          time_spent_seconds: number
          score: number | null
          answers: Json | null
          interactions: Json | null
        }>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      module_type: ModuleType
      assignment_status: AssignmentStatus
    }
    CompositeTypes: Record<string, never>
  }
}
