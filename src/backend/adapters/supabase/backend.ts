// Supabase adapter — all SQL/PostgREST logic lives here.

import { PLATFORM_ORG_ID } from '@/lib/constants'
import { isPublicationActive } from '@/lib/course-publications'
import { getSupabase } from '@/services/supabase'
import type { Backend } from '../../types'
import type { CourseAttemptResult } from '@/types/training.types'
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
import type { Organization, Profile } from '@/types/user.types'
import { createUnconfiguredBackend } from '../unconfigured'
import {
  addDaysIso,
  enrichAssignment,
  syncCoursePublishedFlag,
  toAttemptRow,
  toDueDate,
  toModuleInsert,
  type CourseInsert,
  type CourseUpdate,
  type ModuleInsert,
  type ModuleUpdate,
  type ModuleAttemptUpdate,
} from './helpers'

export function createSupabaseBackend(): Backend {
  const supabase = getSupabase()
  if (!supabase) return createUnconfiguredBackend()

  return {
    kind: 'supabase',
    auth: {
      async signIn(email, password) {
        const normalizedEmail = email.trim().toLowerCase()

        const { data: lockStatus, error: lockError } = await supabase.rpc('check_login_status', {
          p_email: normalizedEmail,
        })
        if (lockError && lockError.code !== 'PGRST202') throw lockError
        if (lockStatus && typeof lockStatus === 'object' && (lockStatus as { locked?: boolean }).locked) {
          throw new Error('Account locked. Contact your manager or administrator to restore access.')
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (error) {
          await supabase.rpc('record_failed_login', { p_email: normalizedEmail })
          throw error
        }

        await supabase.rpc('clear_failed_login', { p_user_id: data.user.id })

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
      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
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
      async deleteCourse(id) {
        const { data, error } = await supabase.from('courses').delete().eq('id', id).select('id')
        if (error) throw error
        if (!data?.length) {
          throw new Error(
            'Could not delete course. You may not have permission — contact your administrator.'
          )
        }
      },
      async fetchPublicationsForOrg(orgId) {
        const { data, error } = await supabase
          .from('course_publications')
          .select('*')
          .eq('org_id', orgId)
        if (error) throw error
        return data as CoursePublication[]
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
          .is('unpublished_at', null)
        if (error) throw error
        await syncCoursePublishedFlag(supabase, courseId)
      },
      async unpublishCourseEverywhere(courseId) {
        const { error } = await supabase
          .from('course_publications')
          .update({ unpublished_at: new Date().toISOString() })
          .eq('course_id', courseId)
          .is('unpublished_at', null)
        if (error) throw error
        await syncCoursePublishedFlag(supabase, courseId)
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
      async recordCourseAttemptResult(assignmentId, passed, maxAttempts, score): Promise<CourseAttemptResult> {
        const { data, error } = await supabase.rpc('record_course_attempt_result', {
          p_assignment_id: assignmentId,
          p_passed: passed,
          p_max_attempts: maxAttempts,
          p_score: score ?? null,
        })

        if (!error && data) {
          return data as CourseAttemptResult
        }

        const rpcMissing =
          error?.code === 'PGRST202' ||
          error?.code === '42883' ||
          error?.message?.includes('record_course_attempt_result')

        if (!rpcMissing) throw error

        // Fallback when RPC migration not applied yet (requires 011_assignments_update_own RLS)
        const { data: assignment, error: fetchError } = await supabase
          .from('assignments')
          .select('attempts_used, locked_at')
          .eq('id', assignmentId)
          .single()
        if (fetchError) throw fetchError

        const unlimitedAttempts = maxAttempts === 0
        const attemptsUsed = assignment.attempts_used + 1

        if (passed) {
          const { error: updateError } = await supabase
            .from('assignments')
            .update({
              status: 'completed',
              locked_at: null,
              last_score: score ?? null,
              completed_at: new Date().toISOString(),
              attempts_used: attemptsUsed,
            })
            .eq('id', assignmentId)
          if (updateError) throw updateError
          return {
            passed: true,
            attemptsUsed,
            maxAttempts,
            locked: false,
            attemptsRemaining: unlimitedAttempts ? -1 : Math.max(0, maxAttempts - attemptsUsed),
            score: score ?? null,
          }
        }

        const locked = !unlimitedAttempts && attemptsUsed >= maxAttempts
        const { error: updateError } = await supabase
          .from('assignments')
          .update({
            attempts_used: attemptsUsed,
            status: 'in_progress',
            locked_at: locked ? new Date().toISOString() : null,
            last_score: score ?? null,
          })
          .eq('id', assignmentId)
        if (updateError) throw updateError

        return {
          passed: false,
          attemptsUsed,
          maxAttempts,
          locked,
          attemptsRemaining: Math.max(0, maxAttempts - attemptsUsed),
          score: score ?? null,
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
      async fetchUnlockRequestsForAssignment(assignmentId) {
        const { data, error } = await supabase
          .from('course_unlock_requests')
          .select('*')
          .eq('assignment_id', assignmentId)
          .order('requested_at', { ascending: false })
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
        const { error: rpcError } = await supabase.rpc('approve_course_unlock', {
          p_request_id: requestId,
          p_admin_id: adminId,
          p_approved: approved,
        })

        if (!rpcError) return

        const rpcMissing =
          rpcError.code === 'PGRST202' ||
          rpcError.code === '42883' ||
          rpcError.message?.includes('approve_course_unlock')

        if (!rpcMissing) throw rpcError

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
              last_score: null,
              completed_at: null,
            })
            .eq('id', request.assignment_id)
          if (unlockError) throw unlockError
        }
      },
      async fetchAssignments(filters) {
        const opts = typeof filters === 'string' ? { userId: filters } : filters

        let q = supabase
          .from('assignments')
          .select(
            '*, course:courses(*), user:profiles!assignments_user_id_fkey(id, full_name, email), training_sessions(id, score, passed, completed_at, started_at, course_id, attempt_number)'
          )

        if (opts?.userId) {
          q = q.eq('user_id', opts.userId)
        } else if (opts?.managerId) {
          const { data: members, error: membersError } = await supabase
            .from('profiles')
            .select('id')
            .eq('manager_id', opts.managerId)
          if (membersError) throw membersError
          const memberIds = members?.map((m) => m.id) ?? []
          if (memberIds.length === 0) return []
          q = q.in('user_id', memberIds)
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

        let rows = (data ?? []) as (Assignment & { training_sessions?: TrainingSession[] })[]

        const filterByActivePublications = async (orgId: string) => {
          const { data: publications } = await supabase
            .from('course_publications')
            .select('course_id, published_at, available_until, unpublished_at')
            .eq('org_id', orgId)

          const activeCourseIds = new Set(
            (publications ?? [])
              .filter((pub) => isPublicationActive(pub as CoursePublication))
              .map((pub) => pub.course_id)
          )

          rows = rows.filter(
            (row) => row.status === 'completed' || activeCourseIds.has(row.course_id)
          )
        }

        if (opts?.orgId) {
          await filterByActivePublications(opts.orgId)
        } else if (opts?.userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('org_id, role')
            .eq('id', opts.userId)
            .maybeSingle()

          if (profile?.org_id && profile.role !== 'admin') {
            await filterByActivePublications(profile.org_id)
          }
        }

        return rows.map((row) => enrichAssignment(row))
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

        const { data: courseRow } = await supabase
          .from('courses')
          .select('max_attempts')
          .eq('id', courseId)
          .maybeSingle()
        const unlimitedAttempts = courseRow?.max_attempts === 0

        if (assignment.locked_at && !unlimitedAttempts) {
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
      async fetchOrgModuleAttempts(orgId) {
        const { data: members, error: membersError } = await supabase
          .from('profiles')
          .select('id')
          .eq('org_id', orgId)
          .neq('role', 'admin')
        if (membersError) throw membersError
        const memberIds = members?.map((m) => m.id) ?? []
        if (memberIds.length === 0) return []

        const { data, error } = await supabase
          .from('module_attempts')
          .select(
            '*, module:modules(id, title, type, course_id, content), user:profiles!module_attempts_user_id_fkey(full_name, email)'
          )
          .in('user_id', memberIds)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
        if (error) throw error
        return (data ?? []) as ModuleAttempt[]
      },
      async fetchUserModuleAttempts(userId) {
        const { data, error } = await supabase
          .from('module_attempts')
          .select('*, module:modules(id, title, type, course_id, content)')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
        if (error) throw error
        return (data ?? []) as ModuleAttempt[]
      },
    },
  }
}
