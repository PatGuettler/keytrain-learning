import { absoluteAppUrl } from '@/lib/paths'
import { DEMO_USERS } from '@/lib/constants'
import { demoCourses, demoProfiles, getDemoAssignments, getDemoCourses, getDemoModules, getDemoProfiles, upsertDemoAssignment } from '@/services/demo-data'
import { getSupabase, isSupabaseConfigured } from '@/services/supabase'
import type { Backend } from './types'
import type { Assignment, Course, Module, ModuleAttempt, TrainingSession } from '@/types/course.types'
import type { Database, Json } from '@/types/database.types'
import type { Profile } from '@/types/user.types'

type CourseInsert = Database['public']['Tables']['courses']['Insert']
type CourseUpdate = Database['public']['Tables']['courses']['Update']
type ModuleInsert = Database['public']['Tables']['modules']['Insert']
type ModuleUpdate = Database['public']['Tables']['modules']['Update']
type ModuleAttemptInsert = Database['public']['Tables']['module_attempts']['Insert']
type ModuleAttemptUpdate = Database['public']['Tables']['module_attempts']['Update']

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

// -------------------------------------------------------------------------------------
// Demo backend (free, local-only)
// -------------------------------------------------------------------------------------

function createDemoBackend(): Backend {
  return {
    kind: 'demo',
    auth: {
      async signIn(email, password) {
        const demo = Object.values(DEMO_USERS).find((u) => u.email === email && u.password === password)
        if (!demo) throw new Error('Invalid credentials. Use demo accounts listed on the login page.')
        const profile = demoProfiles.find((p) => p.id === demo.id)!
        return { user: { id: demo.id, email: demo.email }, profile, demoMode: true }
      },
      async signOut() {},
      async fetchProfile(userId) {
        const p = demoProfiles.find((x) => x.id === userId)
        if (!p) throw new Error('Profile not found')
        return p
      },
      async resetPassword() {
        throw new Error('Demo mode does not send password reset emails')
      },
      async getSession() {
        return null
      },
    },
    users: {
      async fetchProfiles(filters) {
        let list = getDemoProfiles()
        if (filters?.role) list = list.filter((p) => p.role === filters.role)
        if (filters?.managerId) list = list.filter((p) => p.manager_id === filters.managerId)
        if (filters?.orgId) list = list.filter((p) => p.org_id === filters.orgId)
        return list
      },
      async updateProfile(_id, patch) {
        // demo mode does not persist profile updates (safe for free demos)
        return patch as Profile
      },
    },
    courses: {
      async fetchCourses(_orgId, publishedOnly = false) {
        return getDemoCourses(publishedOnly)
      },
      async fetchCourse(id) {
        return demoCourses.find((c) => c.id === id) ?? null
      },
      async fetchModules(courseId) {
        return getDemoModules(courseId)
      },
      async upsertCourse(course) {
        return course as Course
      },
      async upsertModule(module) {
        return module as Module
      },
      async deleteModule() {},
    },
    assignments: {
      async fetchAssignments(userId) {
        return getDemoAssignments(userId)
      },
      async createAssignment(payload) {
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
      },
      async updateAssignment(id, patch) {
        const list = getDemoAssignments()
        const a = list.find((x) => x.id === id)
        if (a) upsertDemoAssignment({ ...a, ...patch })
        return a
      },
      async deleteAssignment() {},
    },
    training: {
      async startSession(assignmentId, userId, courseId) {
        const { createDemoSession } = await import('@/services/demo-data')
        return createDemoSession(assignmentId, userId, courseId)
      },
      async updateSessionTime(sessionId, seconds) {
        const { updateDemoSession } = await import('@/services/demo-data')
        updateDemoSession(sessionId, { time_spent_seconds: seconds })
      },
      async completeSession(sessionId, payload) {
        const { updateDemoSession } = await import('@/services/demo-data')
        updateDemoSession(sessionId, { ...payload, completed_at: new Date().toISOString() })
      },
      async saveModuleAttempt(attempt) {
        const { saveDemoModuleAttempt } = await import('@/services/demo-data')
        return saveDemoModuleAttempt({
          session_id: attempt.session_id,
          module_id: attempt.module_id,
          user_id: attempt.user_id,
          started_at: attempt.started_at ?? new Date().toISOString(),
          completed_at: attempt.completed_at ?? new Date().toISOString(),
          time_spent_seconds: attempt.time_spent_seconds ?? 0,
          score: attempt.score ?? null,
          answers: attempt.answers ?? null,
          interactions: attempt.interactions ?? null,
          id: attempt.id,
        })
      },
      async fetchSessions() {
        return []
      },
    },
  }
}

// -------------------------------------------------------------------------------------
// Supabase backend (production v1)
// -------------------------------------------------------------------------------------

function createSupabaseBackend(): Backend {
  const supabase = getSupabase()
  if (!supabase) return createDemoBackend()

  return {
    kind: 'supabase',
    auth: {
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const profile = await this.fetchProfile(data.user.id)
        return { user: data.user, profile, demoMode: false }
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
        let q = supabase.from('profiles').select('*').eq('is_active', true)
        if (filters?.orgId) q = q.eq('org_id', filters.orgId)
        if (filters?.managerId) q = q.eq('manager_id', filters.managerId)
        if (filters?.role) q = q.eq('role', filters.role)
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
    courses: {
      async fetchCourses(orgId, publishedOnly = false) {
        let q = supabase.from('courses').select('*').eq('org_id', orgId).order('title')
        if (publishedOnly) q = q.eq('is_published', true)
        const { data, error } = await q
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
      async fetchAssignments(userId) {
        let q = supabase.from('assignments').select('*, course:courses(*)')
        if (userId) q = q.eq('user_id', userId)
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
  if (forced === 'demo') return createDemoBackend()
  if (forced === 'supabase') return createSupabaseBackend()
  // aws adapter placeholder: implement later
  if (forced === 'aws') return createSupabaseBackend()

  if (isSupabaseConfigured) return createSupabaseBackend()
  return createDemoBackend()
}

export function getResetPasswordRedirectUrl(): string {
  return absoluteAppUrl('reset-password')
}

