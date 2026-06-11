import { PLATFORM_ORG_ID } from '@/lib/constants'
import { absoluteAppUrl } from '@/lib/paths'
import { getSupabase, isSupabaseConfigured } from '@/services/supabase'
import type { Backend } from './types'
import type { Assignment, Course, Module, ModuleAttempt, TrainingSession } from '@/types/course.types'
import type { Database, Json } from '@/types/database.types'
import type { Organization, Profile } from '@/types/user.types'

type CourseInsert = Database['public']['Tables']['courses']['Insert']
type CourseUpdate = Database['public']['Tables']['courses']['Update']
type ModuleInsert = Database['public']['Tables']['modules']['Insert']
type ModuleUpdate = Database['public']['Tables']['modules']['Update']
type ModuleAttemptInsert = Database['public']['Tables']['module_attempts']['Insert']
type ModuleAttemptUpdate = Database['public']['Tables']['module_attempts']['Update']

const NOT_CONFIGURED =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'

function toModuleInsert(
  module: Partial<Module> & { course_id: string; title: string; type: Module['type'] }
): ModuleInsert {
  const { content, ...rest } = module
  return { ...rest, content: content as Json | undefined }
}

function toAttemptRow(
  attempt: Partial<ModuleAttempt> & { session_id: string; module_id: string; user_id: string }
): ModuleAttemptInsert {
  const { answers, interactions, ...rest } = attempt
  return {
    ...rest,
    answers: answers as Json | null | undefined,
    interactions: interactions as Json | null | undefined,
  }
}

function createUnconfiguredBackend(): Backend {
  const fail = async () => {
    throw new Error(NOT_CONFIGURED)
  }
  return {
    kind: 'unconfigured',
    auth: {
      signIn: fail,
      signOut: async () => {},
      fetchProfile: fail,
      resetPassword: fail,
      getSession: async () => null,
    },
    users: { fetchProfiles: fail, updateProfile: fail },
    organizations: {
      fetchOrganizations: fail,
      createOrganization: fail,
      updateOrganization: fail,
      deleteOrganization: fail,
    },
    courses: {
      fetchCourses: fail,
      fetchHospitalCourses: fail,
      fetchCourse: fail,
      fetchModules: fail,
      upsertCourse: fail,
      upsertModule: fail,
      deleteModule: fail,
    },
    assignments: {
      fetchAssignments: fail,
      createAssignment: fail,
      updateAssignment: fail,
      deleteAssignment: fail,
    },
    training: {
      startSession: fail,
      updateSessionTime: fail,
      completeSession: fail,
      saveModuleAttempt: fail,
      fetchSessions: fail,
    },
  }
}

function createSupabaseBackend(): Backend {
  const supabase = getSupabase()
  if (!supabase) return createUnconfiguredBackend()

  return {
    kind: 'supabase',
    auth: {
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const profile = await this.fetchProfile(data.user.id)
        return { user: data.user, profile }
      },
      async signOut() {
        await supabase.auth.signOut()
      },
      async fetchProfile(userId) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (error) throw error
        return data as Profile
      },
      async resetPassword(email, redirectTo) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) throw error
      },
      async getSession() {
        const { data } = await supabase.auth.getSession()
        return data.session
      },
    },
    users: {
      async fetchProfiles(filters) {
        let q = supabase.from('profiles').select('*')
        if (!filters?.includeInactive) q = q.eq('is_active', true)
        if (filters?.orgId) q = q.eq('org_id', filters.orgId)
        if (filters?.managerId) q = q.eq('manager_id', filters.managerId)
        if (filters?.role) q = q.eq('role', filters.role)
        if (filters?.excludeAdmins) q = q.neq('role', 'admin')
        const { data, error } = await q.order('full_name')
        if (error) throw error
        return data as Profile[]
      },
      async updateProfile(id, patch) {
        const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single()
        if (error) throw error
        return data as Profile
      },
    },
    organizations: {
      async fetchOrganizations() {
        const { data, error } = await supabase.from('organizations').select('*').order('name')
        if (error) throw error
        return data as Organization[]
      },
      async createOrganization(name) {
        const { data, error } = await supabase.from('organizations').insert({ name }).select().single()
        if (error) throw error
        return data as Organization
      },
      async updateOrganization(id, patch) {
        const { data, error } = await supabase.from('organizations').update(patch).eq('id', id).select().single()
        if (error) throw error
        return data as Organization
      },
      async deleteOrganization(id) {
        const { data, error } = await supabase.from('organizations').delete().eq('id', id).select('id')
        if (error) throw error
        if (!data?.length) {
          throw new Error(
            'Could not delete organization. You may not have permission — contact your administrator.'
          )
        }
      },
    },
    courses: {
      async fetchCourses(orgId, publishedOnly = false) {
        let q = supabase.from('courses').select('*').eq('org_id', orgId).order('title')
        if (publishedOnly) q = q.eq('is_published', true)
        const { data, error } = await q
        if (error) throw error
        return data as Course[]
      },
      async fetchHospitalCourses() {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .neq('org_id', PLATFORM_ORG_ID)
          .order('title')
        if (error) throw error
        return data as Course[]
      },
      async fetchCourse(id) {
        const { data, error } = await supabase.from('courses').select('*').eq('id', id).single()
        if (error) return null
        return data as Course
      },
      async fetchModules(courseId) {
        const { data, error } = await supabase
          .from('modules')
          .select('*')
          .eq('course_id', courseId)
          .order('order_index')
        if (error) throw error
        return data as Module[]
      },
      async upsertCourse(course) {
        if (course.id) {
          const { data, error } = await supabase
            .from('courses')
            .update(course as CourseUpdate)
            .eq('id', course.id)
            .select()
            .single()
          if (error) throw error
          return data as Course
        }
        const { data, error } = await supabase.from('courses').insert(course as CourseInsert).select().single()
        if (error) throw error
        return data as Course
      },
      async upsertModule(module) {
        const row = toModuleInsert(module)
        if (module.id) {
          const { data, error } = await supabase
            .from('modules')
            .update(row as ModuleUpdate)
            .eq('id', module.id)
            .select()
            .single()
          if (error) throw error
          return data as Module
        }
        const { data, error } = await supabase.from('modules').insert(row).select().single()
        if (error) throw error
        return data as Module
      },
      async deleteModule(id) {
        await supabase.from('modules').delete().eq('id', id)
      },
    },
    assignments: {
      async fetchAssignments(filters) {
        const opts = typeof filters === 'string' ? { userId: filters } : filters

        let q = supabase.from('assignments').select('*, course:courses(*)')

        if (opts?.userId) {
          q = q.eq('user_id', opts.userId)
        } else if (opts?.orgId) {
          const { data: members, error: membersError } = await supabase
            .from('profiles')
            .select('id')
            .eq('org_id', opts.orgId)
            .neq('role', 'admin')
          if (membersError) throw membersError
          const memberIds = members?.map((m) => m.id) ?? []
          if (memberIds.length === 0) return []
          q = q.in('user_id', memberIds)
        }

        const { data, error } = await q.order('assigned_at', { ascending: false })
        if (error) throw error
        return data as Assignment[]
      },
      async createAssignment(payload) {
        const { data, error } = await supabase
          .from('assignments')
          .insert({ ...payload, status: 'pending' })
          .select()
          .single()
        if (error) throw error
        return data as Assignment
      },
      async updateAssignment(id, patch) {
        const { data, error } = await supabase.from('assignments').update(patch).eq('id', id).select().single()
        if (error) throw error
        return data as Assignment
      },
      async deleteAssignment(id) {
        await supabase.from('assignments').delete().eq('id', id)
      },
    },
    training: {
      async startSession(assignmentId, userId, courseId) {
        const { data, error } = await supabase
          .from('training_sessions')
          .insert({ assignment_id: assignmentId, user_id: userId, course_id: courseId })
          .select()
          .single()
        if (error) throw error
        return data as TrainingSession
      },
      async updateSessionTime(sessionId, seconds) {
        await supabase.from('training_sessions').update({ time_spent_seconds: seconds }).eq('id', sessionId)
      },
      async completeSession(sessionId, payload) {
        await supabase
          .from('training_sessions')
          .update({ ...payload, completed_at: new Date().toISOString() })
          .eq('id', sessionId)
      },
      async saveModuleAttempt(attempt) {
        const row = toAttemptRow(attempt)
        if (attempt.id) {
          const { data, error } = await supabase
            .from('module_attempts')
            .update(row as ModuleAttemptUpdate)
            .eq('id', attempt.id)
            .select()
            .single()
          if (error) throw error
          return data as ModuleAttempt
        }
        const { data, error } = await supabase.from('module_attempts').insert(row).select().single()
        if (error) throw error
        return data as ModuleAttempt
      },
      async fetchSessions(userId) {
        let q = supabase.from('training_sessions').select('*')
        if (userId) q = q.eq('user_id', userId)
        const { data, error } = await q.order('started_at', { ascending: false })
        if (error) throw error
        return data as TrainingSession[]
      },
    },
  }
}

export function createBackend(): Backend {
  const forced = (import.meta.env.VITE_BACKEND as string | undefined)?.toLowerCase()
  if (forced === 'demo') {
    throw new Error('Demo mode has been removed. Configure Supabase and set VITE_BACKEND=supabase.')
  }
  if (forced === 'aws') return createSupabaseBackend()
  if (forced === 'supabase' || isSupabaseConfigured) return createSupabaseBackend()
  return createUnconfiguredBackend()
}

export function getResetPasswordRedirectUrl(): string {
  return absoluteAppUrl('reset-password')
}
