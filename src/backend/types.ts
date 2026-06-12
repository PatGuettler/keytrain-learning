import type {
  Assignment,
  AssignmentStatus,
  Course,
  CoursePublication,
  CoursePublicationNotice,
  CourseUnlockRequest,
  Module,
  ModuleAttempt,
  TrainingSession,
  UnlockRequestStatus,
} from '@/types/course.types'
import type { AdminProfileUpdate, Organization, Profile, UserRole } from '@/types/user.types'

export interface AuthSignInResult {
  user: { id: string; email?: string }
  profile: Profile
}

export interface AuthBackend {
  signIn(email: string, password: string): Promise<AuthSignInResult>
  signOut(): Promise<void>
  fetchProfile(userId: string): Promise<Profile>
  resetPassword(email: string, redirectTo: string): Promise<void>
  getSession(): Promise<unknown | null>
}

export interface UsersBackend {
  fetchProfiles(filters?: {
    orgId?: string
    managerId?: string
    role?: UserRole
    includeInactive?: boolean
    /** Omit platform admins from org staff lists */
    excludeAdmins?: boolean
  }): Promise<Profile[]>
  updateProfile(id: string, patch: AdminProfileUpdate): Promise<Profile>
}

export interface OrganizationsBackend {
  fetchOrganizations(): Promise<Organization[]>
  createOrganization(name: string): Promise<Organization>
  updateOrganization(id: string, patch: { name: string }): Promise<Organization>
  deleteOrganization(id: string): Promise<void>
}

export interface CoursesBackend {
  fetchCourses(orgId: string, publishedOnly?: boolean): Promise<Course[]>
  fetchHospitalCourses(): Promise<Course[]>
  fetchCourse(id: string): Promise<Course | null>
  fetchLearnerCourse(courseId: string, orgId: string): Promise<Course | null>
  fetchModules(courseId: string): Promise<Module[]>
  upsertCourse(course: Partial<Course> & { org_id: string; title: string }): Promise<Course>
  deleteCourse(id: string): Promise<void>
  upsertModule(module: Partial<Module> & { course_id: string; title: string; type: Module['type'] }): Promise<Module>
  deleteModule(id: string): Promise<void>
  /** Remove modules not in keepIds so edits replace the live course (no version history). */
  syncCourseModules(courseId: string, keepModuleIds: string[]): Promise<void>
  fetchPublicationsForOrg(orgId: string): Promise<CoursePublication[]>
  fetchPublicationsForCourse(courseId: string): Promise<CoursePublication[]>
  publishCourseToOrg(payload: {
    courseId: string
    orgId: string
    publishedBy: string
    availableDays?: number | null
  }): Promise<CoursePublication>
  unpublishCourseFromOrg(courseId: string, orgId: string): Promise<void>
  unpublishCourseEverywhere(courseId: string): Promise<void>
  setCourseAvailability(courseId: string, orgId: string, availableDays: number | null): Promise<CoursePublication>
  fetchUnacknowledgedNotices(userId: string, orgId: string): Promise<CoursePublicationNotice[]>
  acknowledgeCourseNotice(publicationId: string, userId: string): Promise<void>
}

export interface AssignmentFilters {
  userId?: string
  orgId?: string
  managerId?: string
}

export interface CourseAttemptResult {
  passed: boolean
  attemptsUsed: number
  maxAttempts: number
  locked: boolean
  attemptsRemaining: number
  score: number | null
}

export interface AssignmentsBackend {
  fetchAssignments(filters?: string | AssignmentFilters): Promise<Assignment[]>
  syncRequiredAssignmentsForUser(userId: string): Promise<void>
  recordCourseAttemptResult(
    assignmentId: string,
    passed: boolean,
    maxAttempts: number,
    score?: number
  ): Promise<CourseAttemptResult>
  requestCourseUnlock(payload: {
    assignmentId: string
    userId: string
    courseId: string
    orgId: string
    message?: string
  }): Promise<CourseUnlockRequest>
  fetchUnlockRequests(status?: UnlockRequestStatus): Promise<CourseUnlockRequest[]>
  fetchPendingUnlockForAssignment(assignmentId: string, userId: string): Promise<CourseUnlockRequest | null>
  resolveUnlockRequest(requestId: string, approved: boolean, adminId: string): Promise<void>
  createAssignment(payload: { course_id: string; user_id: string; assigned_by: string; due_date?: string }): Promise<Assignment>
  updateAssignment(
    id: string,
    patch: Partial<{
      status: AssignmentStatus
      force_retake: boolean
      due_date: string | null
      attempts_used: number
      locked_at: string | null
    }>
  ): Promise<Assignment | undefined>
  deleteAssignment(id: string): Promise<void>
}

export interface TrainingBackend {
  startSession(assignmentId: string, userId: string, courseId: string): Promise<TrainingSession>
  updateSessionTime(sessionId: string, seconds: number): Promise<void>
  completeSession(sessionId: string, payload: { score: number; passed: boolean; time_spent_seconds: number }): Promise<void>
  saveModuleAttempt(attempt: Partial<ModuleAttempt> & { session_id: string; module_id: string; user_id: string }): Promise<ModuleAttempt>
  fetchSessions(userId?: string): Promise<TrainingSession[]>
  fetchOrgModuleAttempts(orgId: string): Promise<ModuleAttempt[]>
  fetchUserModuleAttempts(userId: string): Promise<ModuleAttempt[]>
}

export interface Backend {
  auth: AuthBackend
  users: UsersBackend
  organizations: OrganizationsBackend
  courses: CoursesBackend
  assignments: AssignmentsBackend
  training: TrainingBackend
  /** Indicates which backend is active (supabase/aws...). */
  kind: string
}

