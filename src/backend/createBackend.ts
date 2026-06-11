import { PLATFORM_ORG_ID } from '@/lib/constants'
import { absoluteAppUrl } from '@/lib/paths'
import { getSupabase, isSupabaseConfigured } from '@/services/supabase'
import type { Backend } from './types'
import type {
  Assignment,
  Course,
  CoursePublication,
  CoursePublicationNotice,
  CourseUnlockRequest,
  Module,
  ModuleAttempt,
  TrainingSession,
} from '@/types/course.types'
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

function isPublicationActive(pub: CoursePublication): boolean {
  if (pub.unpublished_at) return false
  if (new Date(pub.published_at) > new Date()) return false
  if (pub.available_until && new Date(pub.available_until) <= new Date()) return false
  return true
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

function toDueDate(availableUntil: string | null): string | undefined {
  if (!availableUntil) return undefined
  return availableUntil.split('T')[0]
}

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
      fetchLearnerCourse: fail,
      fetchModules: fail,
      upsertCourse: fail,
      upsertModule: fail,
      deleteModule: fail,
      syncCourseModules: fail,
      fetchPublicationsForCourse: fail,
      publishCourseToOrg: fail,
      unpublishCourseFromOrg: fail,
      setCourseAvailability: fail,
      fetchUnacknowledgedNotices: fail,
      acknowledgeCourseNotice: fail,
    },
    assignments: {
      fetchAssignments: fail,
      syncRequiredAssignmentsForUser: fail,
      recordCourseAttemptResult: fail,
      requestCourseUnlock: fail,
      fetchUnlockRequests: fail,
      fetchPendingUnlockForAssignment: fail,
      resolveUnlockRequest: fail,
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
        if (publishedOnly) {
          const { data, error } = await supabase
            .from('course_publications')
            .select('*, course:courses(*)')
            .eq('org_id', orgId)
            .is('unpublished_at', null)
          if (error) throw error
          return (data ?? [])
            .filter((row) => isPublicationActive(row as CoursePublication))
            .map((row) => {
              const pub = row as CoursePublication & { course: Course }
              return { ...pub.course, publication: pub }
            })
            .sort((a, b) => a.title.localeCompare(b.title))
        }

        const { data, error } = await supabase.from('courses').select('*').eq('org_id', orgId).order('title')
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
      async fetchLearnerCourse(courseId, orgId) {
        const { data, error } = await supabase
          .from('course_publications')
          .select('*, course:courses(*)')
          .eq('course_id', courseId)
          .eq('org_id', orgId)
          .is('unpublished_at', null)
          .maybeSingle()
        if (error) throw error
        if (!data) return null
        const pub = data as CoursePublication & { course: Course }
        if (!isPublicationActive(pub) || !pub.course) return null
        return { ...pub.course, publication: pub }
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
        const isPersistedId = module.id && !module.id.startsWith('temp-')
        if (isPersistedId) {
          const { data, error } = await supabase
            .from('modules')
            .update(row as ModuleUpdate)
            .eq('id', module.id!)
            .select()
            .single()
          if (error) throw error
          return data as Module
        }
        const { id: _omit, ...insertRow } = row as ModuleInsert & { id?: string }
        const { data, error } = await supabase.from('modules').insert(insertRow).select().single()
        if (error) throw error
        return data as Module
      },
      async deleteModule(id) {
        await supabase.from('modules').delete().eq('id', id)
      },
      async syncCourseModules(courseId, keepModuleIds) {
        const { data: existing, error } = await supabase
          .from('modules')
          .select('id')
          .eq('course_id', courseId)
        if (error) throw error
        const keep = new Set(keepModuleIds)
        const orphanIds = (existing ?? []).filter((m) => !keep.has(m.id)).map((m) => m.id)
        if (orphanIds.length === 0) return
        const { error: deleteError } = await supabase.from('modules').delete().in('id', orphanIds)
        if (deleteError) throw deleteError
      },
      async fetchPublicationsForCourse(courseId) {
        const { data, error } = await supabase
          .from('course_publications')
          .select('*')
          .eq('course_id', courseId)
          .order('published_at', { ascending: false })
        if (error) throw error
        return data as CoursePublication[]
      },
      async publishCourseToOrg({ courseId, orgId, publishedBy, availableDays }) {
        const availableUntil =
          availableDays != null && availableDays > 0 ? addDaysIso(availableDays) : null

        const { data: pub, error } = await supabase
          .from('course_publications')
          .upsert(
            {
              course_id: courseId,
              org_id: orgId,
              published_at: new Date().toISOString(),
              available_until: availableUntil,
              unpublished_at: null,
              published_by: publishedBy,
            },
            { onConflict: 'course_id,org_id' }
          )
          .select()
          .single()
        if (error) throw error

        await supabase.from('course_publication_acknowledgments').delete().eq('publication_id', pub.id)
        await supabase.from('courses').update({ is_published: true }).eq('id', courseId)

        const { data: members, error: membersError } = await supabase
          .from('profiles')
          .select('id')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .in('role', ['employee', 'manager'])
        if (membersError) throw membersError

        const dueDate = toDueDate(availableUntil)
        for (const member of members ?? []) {
          const { data: existing } = await supabase
            .from('assignments')
            .select('id, status')
            .eq('course_id', courseId)
            .eq('user_id', member.id)
            .maybeSingle()

          if (!existing) {
            await supabase.from('assignments').insert({
              course_id: courseId,
              user_id: member.id,
              assigned_by: publishedBy,
              due_date: dueDate ?? null,
              status: 'pending',
            })
          } else if (existing.status !== 'completed' && dueDate) {
            await supabase.from('assignments').update({ due_date: dueDate }).eq('id', existing.id)
          }
        }

        return pub as CoursePublication
      },
      async unpublishCourseFromOrg(courseId, orgId) {
        const { error } = await supabase
          .from('course_publications')
          .update({ unpublished_at: new Date().toISOString() })
          .eq('course_id', courseId)
          .eq('org_id', orgId)
        if (error) throw error
      },
      async setCourseAvailability(courseId, orgId, availableDays) {
        const availableUntil = availableDays != null && availableDays > 0 ? addDaysIso(availableDays) : null
        const { data, error } = await supabase
          .from('course_publications')
          .update({
            available_until: availableUntil,
            unpublished_at: null,
          })
          .eq('course_id', courseId)
          .eq('org_id', orgId)
          .select()
          .single()
        if (error) throw error

        const dueDate = toDueDate(availableUntil)
        if (dueDate) {
          const { data: members } = await supabase
            .from('profiles')
            .select('id')
            .eq('org_id', orgId)
            .eq('is_active', true)
            .in('role', ['employee', 'manager'])

          for (const member of members ?? []) {
            const { data: assignment } = await supabase
              .from('assignments')
              .select('id, status')
              .eq('course_id', courseId)
              .eq('user_id', member.id)
              .maybeSingle()
            if (assignment && assignment.status !== 'completed') {
              await supabase.from('assignments').update({ due_date: dueDate }).eq('id', assignment.id)
            }
          }
        }

        return data as CoursePublication
      },
      async fetchUnacknowledgedNotices(userId, orgId) {
        const { data: publications, error } = await supabase
          .from('course_publications')
          .select('*, course:courses(*)')
          .eq('org_id', orgId)
          .is('unpublished_at', null)
        if (error) throw error

        const { data: acks, error: ackError } = await supabase
          .from('course_publication_acknowledgments')
          .select('publication_id')
          .eq('user_id', userId)
        if (ackError) throw ackError

        const acknowledged = new Set((acks ?? []).map((a) => a.publication_id))

        return (publications ?? [])
          .filter((row) => isPublicationActive(row as CoursePublication))
          .filter((row) => !acknowledged.has(row.id))
          .map((row) => {
            const pub = row as CoursePublication & { course: Course }
            return { publication: pub, course: pub.course }
          }) as CoursePublicationNotice[]
      },
      async acknowledgeCourseNotice(publicationId, userId) {
        const { error } = await supabase.from('course_publication_acknowledgments').upsert(
          {
            publication_id: publicationId,
            user_id: userId,
            acknowledged_at: new Date().toISOString(),
          },
          { onConflict: 'publication_id,user_id' }
        )
        if (error) throw error
      },
    },
    assignments: {
      async syncRequiredAssignmentsForUser(userId) {
        const { error } = await supabase.rpc('sync_user_required_assignments', {
          p_user_id: userId,
        })
        if (error) throw error
      },
      async recordCourseAttemptResult(assignmentId, passed, maxAttempts) {
        const { data: assignment, error: fetchError } = await supabase
          .from('assignments')
          .select('attempts_used, locked_at')
          .eq('id', assignmentId)
          .single()
        if (fetchError) throw fetchError

        if (passed) {
          const { error } = await supabase
            .from('assignments')
            .update({ status: 'completed', locked_at: null })
            .eq('id', assignmentId)
          if (error) throw error
          return {
            passed: true,
            attemptsUsed: assignment.attempts_used,
            maxAttempts,
            locked: false,
            attemptsRemaining: maxAttempts - assignment.attempts_used,
          }
        }

        const attemptsUsed = assignment.attempts_used + 1
        const locked = attemptsUsed >= maxAttempts
        const { error } = await supabase
          .from('assignments')
          .update({
            attempts_used: attemptsUsed,
            status: 'in_progress',
            locked_at: locked ? new Date().toISOString() : null,
          })
          .eq('id', assignmentId)
        if (error) throw error

        return {
          passed: false,
          attemptsUsed,
          maxAttempts,
          locked,
          attemptsRemaining: Math.max(0, maxAttempts - attemptsUsed),
        }
      },
      async requestCourseUnlock({ assignmentId, userId, courseId, orgId, message }) {
        const { data, error } = await supabase
          .from('course_unlock_requests')
          .insert({
            assignment_id: assignmentId,
            user_id: userId,
            course_id: courseId,
            org_id: orgId,
            message: message?.trim() || null,
            status: 'pending',
          })
          .select()
          .single()
        if (error) throw error
        return data as CourseUnlockRequest
      },
      async fetchUnlockRequests(status) {
        let q = supabase
          .from('course_unlock_requests')
          .select(
            '*, user:profiles!course_unlock_requests_user_id_fkey(full_name, email), course:courses(title), organization:organizations(name)'
          )
          .order('requested_at', { ascending: false })
        if (status) q = q.eq('status', status)
        const { data, error } = await q
        if (error) throw error
        return (data ?? []) as CourseUnlockRequest[]
      },
      async fetchPendingUnlockForAssignment(assignmentId, userId) {
        const { data, error } = await supabase
          .from('course_unlock_requests')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('user_id', userId)
          .eq('status', 'pending')
          .maybeSingle()
        if (error) throw error
        return data as CourseUnlockRequest | null
      },
      async resolveUnlockRequest(requestId, approved, adminId) {
        const { data: request, error: fetchError } = await supabase
          .from('course_unlock_requests')
          .select('assignment_id, status')
          .eq('id', requestId)
          .single()
        if (fetchError) throw fetchError
        if (request.status !== 'pending') throw new Error('Request already resolved.')

        const { error: updateError } = await supabase
          .from('course_unlock_requests')
          .update({
            status: approved ? 'approved' : 'denied',
            resolved_at: new Date().toISOString(),
            resolved_by: adminId,
          })
          .eq('id', requestId)
        if (updateError) throw updateError

        if (approved) {
          const { error: unlockError } = await supabase
            .from('assignments')
            .update({
              locked_at: null,
              attempts_used: 0,
              status: 'in_progress',
              force_retake: true,
            })
            .eq('id', request.assignment_id)
          if (unlockError) throw unlockError
        }
      },
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
        const { data: assignment, error: assignmentError } = await supabase
          .from('assignments')
          .select('locked_at, status')
          .eq('id', assignmentId)
          .single()
        if (assignmentError) throw assignmentError
        if (assignment.locked_at) {
          throw new Error('This course is locked. Request an unlock from your administrator.')
        }
        if (assignment.status === 'completed') {
          throw new Error('You have already completed this course.')
        }

        const { count } = await supabase
          .from('training_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignmentId)

        const { data, error } = await supabase
          .from('training_sessions')
          .insert({
            assignment_id: assignmentId,
            user_id: userId,
            course_id: courseId,
            attempt_number: (count ?? 0) + 1,
          })
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
