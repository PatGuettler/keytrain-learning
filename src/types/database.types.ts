export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'
export type ModuleType = 'lesson' | 'quiz' | 'workshop'
export type UserRole = 'admin' | 'org_admin' | 'manager' | 'employee'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          railnet_org_id: string | null
          join_code: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          railnet_org_id?: string | null
          join_code?: string | null
        }
        Update: Partial<{
          name: string
          railnet_org_id: string | null
          join_code: string | null
        }>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          org_id: string
          manager_id: string | null
          full_name: string
          email: string | null
          role: UserRole
          avatar_url: string | null
          is_active: boolean
          invitation_pending: boolean
          password_upgrade_required: boolean
          failed_login_attempts: number
          login_locked_at: string | null
          last_login_at: string | null
          daily_verse_enabled: boolean
          railnet_enabled: boolean
          railnet_table_prefs: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          org_id: string
          manager_id?: string | null
          full_name: string
          email?: string | null
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          invitation_pending?: boolean
          password_upgrade_required?: boolean
          failed_login_attempts?: number
          login_locked_at?: string | null
          last_login_at?: string | null
          daily_verse_enabled?: boolean
          railnet_enabled?: boolean
          railnet_table_prefs?: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          org_id: string
          manager_id: string | null
          full_name: string
          email: string | null
          role: UserRole
          avatar_url: string | null
          is_active: boolean
          invitation_pending: boolean
          password_upgrade_required: boolean
          failed_login_attempts: number
          login_locked_at: string | null
          daily_verse_enabled: boolean
          railnet_enabled: boolean
          railnet_table_prefs: Json
        }>
        Relationships: []
      }
      org_license: {
        Row: {
          org_id: string
          railnet_enabled: boolean
          compliance_enabled: boolean
          lms_enabled: boolean
          phishing_enabled: boolean
          plan: string
          max_seats: number | null
          updated_at: string
        }
        Insert: {
          org_id: string
          railnet_enabled?: boolean
          compliance_enabled?: boolean
          lms_enabled?: boolean
          phishing_enabled?: boolean
          plan?: string
          max_seats?: number | null
          updated_at?: string
        }
        Update: Partial<{
          railnet_enabled: boolean
          compliance_enabled: boolean
          lms_enabled: boolean
          phishing_enabled: boolean
          plan: string
          max_seats: number | null
          updated_at: string
        }>
        Relationships: []
      }
      org_billing_terms: {
        Row: {
          org_id: string
          plan: string
          plan_base_cents: number
          org_admin_cents: number
          manager_cents: number
          employee_cents: number
          locked_at: string
          updated_at: string
        }
        Insert: {
          org_id: string
          plan: string
          plan_base_cents: number
          org_admin_cents: number
          manager_cents: number
          employee_cents: number
          locked_at?: string
          updated_at?: string
        }
        Update: Partial<{
          plan: string
          plan_base_cents: number
          org_admin_cents: number
          manager_cents: number
          employee_cents: number
          locked_at: string
          updated_at: string
        }>
        Relationships: []
      }
      organization_memberships: {
        Row: {
          id: string
          user_id: string
          org_id: string
          role: UserRole
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id: string
          role: UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          role: UserRole
          is_active: boolean
          updated_at: string
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
          max_attempts: number
          show_results_after_completion: boolean
          certificate_enabled: boolean
          certificate_expires_days: number | null
          is_monthly_catalog: boolean
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
          max_attempts?: number
          show_results_after_completion?: boolean
          certificate_enabled?: boolean
          certificate_expires_days?: number | null
          is_monthly_catalog?: boolean
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
          max_attempts: number
          show_results_after_completion: boolean
          certificate_enabled: boolean
          certificate_expires_days: number | null
          is_monthly_catalog: boolean
          created_by: string | null
        }>
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          user_id: string
          course_id: string
          assignment_id: string | null
          issued_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          assignment_id?: string | null
          issued_at?: string
          expires_at?: string | null
        }
        Update: Partial<{
          user_id: string
          course_id: string
          assignment_id: string | null
          issued_at: string
          expires_at: string | null
        }>
        Relationships: []
      }
      training_tags: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          name: string
          updated_at: string
        }>
        Relationships: []
      }
      course_training_tags: {
        Row: {
          course_id: string
          tag_id: string
        }
        Insert: {
          course_id: string
          tag_id: string
        }
        Update: Partial<{
          course_id: string
          tag_id: string
        }>
        Relationships: []
      }
      organization_training_tags: {
        Row: {
          org_id: string
          tag_id: string
        }
        Insert: {
          org_id: string
          tag_id: string
        }
        Update: Partial<{
          org_id: string
          tag_id: string
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
          attempts_used: number
          locked_at: string | null
          last_score: number | null
          completed_at: string | null
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
          attempts_used?: number
          locked_at?: string | null
          last_score?: number | null
          completed_at?: string | null
        }
        Update: Partial<{
          course_id: string
          user_id: string
          assigned_by: string | null
          due_date: string | null
          status: AssignmentStatus
          force_retake: boolean
          attempts_used: number
          locked_at: string | null
          last_score: number | null
          completed_at: string | null
        }>
        Relationships: [
          {
            foreignKeyName: 'assignments_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assignments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'training_sessions_assignment_id_fkey'
            columns: ['assignment_id']
            isOneToOne: false
            referencedRelation: 'assignments'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'module_attempts_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'training_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'module_attempts_module_id_fkey'
            columns: ['module_id']
            isOneToOne: false
            referencedRelation: 'modules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'module_attempts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      course_publications: {
        Row: {
          id: string
          course_id: string
          org_id: string
          published_at: string
          available_until: string | null
          unpublished_at: string | null
          published_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          org_id: string
          published_at?: string
          available_until?: string | null
          unpublished_at?: string | null
          published_by?: string | null
          created_at?: string
        }
        Update: Partial<{
          course_id: string
          org_id: string
          published_at: string
          available_until: string | null
          unpublished_at: string | null
          published_by: string | null
        }>
        Relationships: [
          {
            foreignKeyName: 'course_publications_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'course_publications_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      course_publication_acknowledgments: {
        Row: {
          publication_id: string
          user_id: string
          acknowledged_at: string
        }
        Insert: {
          publication_id: string
          user_id: string
          acknowledged_at?: string
        }
        Update: Partial<{
          publication_id: string
          user_id: string
          acknowledged_at: string
        }>
        Relationships: []
      }
      course_unlock_requests: {
        Row: {
          id: string
          assignment_id: string
          user_id: string
          course_id: string
          org_id: string
          status: string
          message: string | null
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          assignment_id: string
          user_id: string
          course_id: string
          org_id: string
          status?: string
          message?: string | null
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: Partial<{
          assignment_id: string
          user_id: string
          course_id: string
          org_id: string
          status: string
          message: string | null
          resolved_at: string | null
          resolved_by: string | null
        }>
        Relationships: [
          {
            foreignKeyName: 'course_unlock_requests_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'course_unlock_requests_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'course_unlock_requests_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'course_unlock_requests_assignment_id_fkey'
            columns: ['assignment_id']
            isOneToOne: false
            referencedRelation: 'assignments'
            referencedColumns: ['id']
          },
        ]
      }
      phishing_templates: {
        Row: {
          id: string
          name: string
          pretext: string
          sender_name: string
          sender_email_local: string
          subject: string
          body_html: string
          body_text: string
          difficulty: string
          red_flags: Json
          thumbnail_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          pretext: string
          sender_name: string
          sender_email_local: string
          subject: string
          body_html: string
          body_text: string
          difficulty?: string
          red_flags?: Json
          thumbnail_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<{
          name: string
          pretext: string
          sender_name: string
          sender_email_local: string
          subject: string
          body_html: string
          body_text: string
          difficulty: string
          red_flags: Json
          thumbnail_url: string | null
          is_active: boolean
        }>
        Relationships: []
      }
      phishing_campaigns: {
        Row: {
          id: string
          org_id: string | null
          template_id: string | null
          created_by: string | null
          name: string
          subject: string
          sender_name: string
          sender_email: string
          body_html: string
          body_text: string
          pretext: string | null
          fake_login_url: string | null
          track_opens: boolean
          target_scope: string
          target_user_ids: string[]
          exclude_admins: boolean
          deadline_date: string | null
          status: string
          scheduled_at: string | null
          sent_at: string | null
          test_mode: boolean
          auto_remediate: boolean
          remediation_course_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          template_id?: string | null
          created_by?: string | null
          name: string
          subject: string
          sender_name: string
          sender_email: string
          body_html: string
          body_text?: string
          pretext?: string | null
          fake_login_url?: string | null
          track_opens?: boolean
          target_scope?: string
          target_user_ids?: string[]
          exclude_admins?: boolean
          deadline_date?: string | null
          status?: string
          scheduled_at?: string | null
          sent_at?: string | null
          test_mode?: boolean
          auto_remediate?: boolean
          remediation_course_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          org_id: string | null
          template_id: string | null
          created_by: string | null
          name: string
          subject: string
          sender_name: string
          sender_email: string
          body_html: string
          body_text: string
          pretext: string | null
          fake_login_url: string | null
          track_opens: boolean
          target_scope: string
          target_user_ids: string[]
          exclude_admins: boolean
          deadline_date: string | null
          status: string
          scheduled_at: string | null
          sent_at: string | null
          test_mode: boolean
          auto_remediate: boolean
          remediation_course_id: string | null
          updated_at: string
        }>
        Relationships: []
      }
      phishing_recipients: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          token: string
          sent_at: string | null
          test_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          token?: string
          sent_at?: string | null
          test_sent_at?: string | null
          created_at?: string
        }
        Update: Partial<{
          campaign_id: string
          user_id: string
          token: string
          sent_at: string | null
          test_sent_at: string | null
        }>
        Relationships: []
      }
      phishing_events: {
        Row: {
          id: string
          campaign_id: string
          recipient_id: string
          user_id: string
          event_type: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          recipient_id: string
          user_id: string
          event_type: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: Partial<{
          campaign_id: string
          recipient_id: string
          user_id: string
          event_type: string
          ip_address: string | null
          user_agent: string | null
        }>
        Relationships: []
      }
      daily_verse_dismissals: {
        Row: {
          user_id: string
          local_date: string
          dismissed_at: string
        }
        Insert: {
          user_id: string
          local_date: string
          dismissed_at?: string
        }
        Update: Partial<{
          local_date: string
          dismissed_at: string
        }>
        Relationships: []
      }
      prayer_requests: {
        Row: {
          id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          message: string
          created_at?: string
        }
        Update: Partial<{
          message: string
        }>
        Relationships: [
          {
            foreignKeyName: 'prayer_request_prayers_request_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'prayer_request_prayers'
            referencedColumns: ['request_id']
          },
        ]
      }
      prayer_request_prayers: {
        Row: {
          request_id: string
          admin_id: string
          prayed_at: string
        }
        Insert: {
          request_id: string
          admin_id: string
          prayed_at?: string
        }
        Update: Partial<{
          prayed_at: string
        }>
        Relationships: [
          {
            foreignKeyName: 'prayer_request_prayers_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'prayer_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prayer_request_prayers_admin_id_fkey'
            columns: ['admin_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      list_required_courses_for_user: {
        Args: { p_user_id?: string | null }
        Returns: {
          course_id: string
          publication_id: string
          title: string
          description: string
          thumbnail_url: string | null
          estimated_minutes: number
          max_attempts: number
          show_results_after_completion: boolean
          certificate_enabled: boolean
          certificate_expires_days: number | null
          org_id: string
          published_at: string
          available_until: string | null
        }[]
      }
      sync_user_required_assignments: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      record_course_attempt_result: {
        Args: {
          p_assignment_id: string
          p_passed: boolean
          p_max_attempts: number
          p_score?: number | null
        }
        Returns: {
          passed: boolean
          attemptsUsed: number
          maxAttempts: number
          locked: boolean
          attemptsRemaining: number
          score: number | null
        }
      }
      check_login_status: {
        Args: { p_email: string }
        Returns: { locked: boolean }
      }
      record_failed_login: {
        Args: { p_email: string }
        Returns: undefined
      }
      clear_failed_login: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      unlock_user_login: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      flag_password_upgrade_required: {
        Args: Record<string, never>
        Returns: undefined
      }
      complete_password_upgrade: {
        Args: Record<string, never>
        Returns: undefined
      }
      switch_active_organization: {
        Args: { p_org_id: string }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      create_organization_as_org_admin: {
        Args: { p_name: string }
        Returns: Database['public']['Tables']['organizations']['Row']
      }
      approve_course_unlock: {
        Args: {
          p_request_id: string
          p_admin_id: string
          p_approved: boolean
        }
        Returns: undefined
      }
      admin_assign_course_retake: {
        Args: {
          p_assignment_id: string
          p_admin_id: string
        }
        Returns: undefined
      }
      issue_course_certificate: {
        Args: {
          p_assignment_id: string
          p_user_id: string
        }
        Returns: string | null
      }
    }
    Enums: {
      user_role: UserRole
      module_type: ModuleType
      assignment_status: AssignmentStatus
    }
    CompositeTypes: Record<string, never>
  }
}
