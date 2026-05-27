import type { Assignment, AssignmentStatus, Course, Module, ModuleAttempt, TrainingSession } from '@/types/course.types'
import type { Profile, UserRole } from '@/types/user.types'

export interface AuthSignInResult {
  user: { id: string; email?: string }
  profile: Profile
  demoMode: boolean
}

export interface AuthBackend {
  signIn(email: string, password: string): Promise<AuthSignInResult>
  signOut(): Promise<void>
  fetchProfile(userId: string): Promise<Profile>
  resetPassword(email: string, redirectTo: string): Promise<void>
  getSession(): Promise<unknown | null>
}

export interface UsersBackend {
  fetchProfiles(filters?: { orgId?: string; managerId?: string; role?: UserRole }): Promise<Profile[]>
  updateProfile(id: string, patch: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>): Promise<Profile>
}

export interface CoursesBackend {
  fetchCourses(orgId: string, publishedOnly?: boolean): Promise<Course[]>
  fetchCourse(id: string): Promise<Course | null>
  fetchModules(courseId: string): Promise<Module[]>
  upsertCourse(course: Partial<Course> & { org_id: string; title: string }): Promise<Course>
  upsertModule(module: Partial<Module> & { course_id: string; title: string; type: Module['type'] }): Promise<Module>
  deleteModule(id: string): Promise<void>
}

export interface AssignmentsBackend {
  fetchAssignments(userId?: string): Promise<Assignment[]>
  createAssignment(payload: { course_id: string; user_id: string; assigned_by: string; due_date?: string }): Promise<Assignment>
  updateAssignment(
    id: string,
    patch: Partial<{ status: AssignmentStatus; force_retake: boolean; due_date: string | null }>
  ): Promise<Assignment | undefined>
  deleteAssignment(id: string): Promise<void>
}

export interface TrainingBackend {
  startSession(assignmentId: string, userId: string, courseId: string): Promise<TrainingSession>
  updateSessionTime(sessionId: string, seconds: number): Promise<void>
  completeSession(sessionId: string, payload: { score: number; passed: boolean; time_spent_seconds: number }): Promise<void>
  saveModuleAttempt(attempt: Partial<ModuleAttempt> & { session_id: string; module_id: string; user_id: string }): Promise<ModuleAttempt>
  fetchSessions(userId?: string): Promise<TrainingSession[]>
}

export interface Backend {
  auth: AuthBackend
  users: UsersBackend
  courses: CoursesBackend
  assignments: AssignmentsBackend
  training: TrainingBackend
  /** Indicates which backend is active (demo/supabase/aws...). */
  kind: string
}

