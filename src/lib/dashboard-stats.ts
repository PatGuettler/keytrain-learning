import type { Assignment, Course, Module, ModuleAttempt, TrainingSession } from '@/types/course.types'
import type { Profile } from '@/types/user.types'

/** Assignments that count toward staff progress (active courses + completed history). */
export function filterAssignmentsForReporting(
  assignments: Assignment[],
  activeCourseIds: Set<string>
): Assignment[] {
  if (activeCourseIds.size === 0) {
    return assignments.filter((a) => a.status === 'completed')
  }
  return assignments.filter(
    (a) => a.status === 'completed' || activeCourseIds.has(a.course_id)
  )
}

/** Best-effort attempt count (stored value, session history, or legacy completion). */
export function resolveAttemptsUsed(assignment: Assignment): number {
  if (assignment.force_retake) {
    return assignment.attempts_used ?? 0
  }

  const stored = assignment.attempts_used ?? 0
  const sessions = assignment.training_sessions ?? []
  const completedSessions = sessions.filter((s) => s.completed_at != null)
  const completedCount = completedSessions.length
  const maxCompletedAttempt = completedSessions.reduce(
    (max, s) => Math.max(max, s.attempt_number ?? 0),
    0
  )

  let inferred = Math.max(completedCount, maxCompletedAttempt)

  if (assignment.status === 'completed' && inferred < 1) {
    inferred = 1
  }

  if (stored === 0 && assignment.last_score != null && inferred === 0) {
    const maxSessionAttempt = sessions.reduce(
      (max, s) => Math.max(max, s.attempt_number ?? 0),
      0
    )
    inferred = Math.max(maxSessionAttempt, 1)
  }

  return Math.max(stored, inferred)
}

/** Best display score for an assignment (stored value or latest completed session). */
export function resolveAssignmentScore(assignment: Assignment): number | null {
  if (assignment.last_score != null) {
    return Math.round(Number(assignment.last_score))
  }

  const sessions = assignment.training_sessions ?? []
  const completed = sessions
    .filter((s) => s.completed_at != null && s.score != null)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

  if (completed.length === 0) return null

  const best = completed.find((s) => s.passed) ?? completed[0]
  return Math.round(Number(best.score))
}

/** Average score across completed assignments that have a recorded score. */
export function computeAvgScore(assignments: Assignment[]): number {
  const scores = assignments
    .filter((a) => a.status === 'completed')
    .map(resolveAssignmentScore)
    .filter((s): s is number => s != null)

  if (scores.length === 0) return 0
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
}

export function buildScoreHistory(sessions: TrainingSession[]) {
  return sessions
    .filter((s) => s.completed_at && s.score != null)
    .sort((a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime())
    .map((s) => ({
      date: new Date(s.completed_at!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: Math.round(Number(s.score)),
      courseId: s.course_id,
    }))
}

export interface OrgDashboardMetrics {
  userCount: number
  totalCourses: number
  publishedCourses: number
  assignmentCount: number
  completionRate: number
  overdueCount: number
  inProgressCount: number
}

export interface CourseMetrics {
  course: Course
  assignmentCount: number
  completedCount: number
  inProgressCount: number
  overdueCount: number
  completionRate: number
  avgScore: number | null
}

export function computeCourseMetrics(courses: Course[], assignments: Assignment[]): CourseMetrics[] {
  return courses.map((course) => {
    const courseAssignments = assignments.filter((a) => a.course_id === course.id)
    const completedCount = courseAssignments.filter((a) => a.status === 'completed').length
    const scores = courseAssignments
      .filter((a) => a.status === 'completed')
      .map(resolveAssignmentScore)
      .filter((s): s is number => s != null)
    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : null

    return {
      course,
      assignmentCount: courseAssignments.length,
      completedCount,
      inProgressCount: courseAssignments.filter((a) => a.status === 'in_progress').length,
      overdueCount: courseAssignments.filter((a) => a.status === 'overdue').length,
      completionRate:
        courseAssignments.length > 0 ? Math.round((completedCount / courseAssignments.length) * 100) : 0,
      avgScore,
    }
  })
}

export interface StaffTrainingRow {
  assignmentId: string
  userId: string
  userName: string
  userEmail: string | null
  courseId: string
  courseTitle: string
  status: Assignment['status']
  score: number | null
  attemptsUsed: number
  maxAttempts: number
  locked: boolean
  dueDate: string | null
  unlockRequestCount: number
  pendingUnlockRequest: boolean
}

export interface StaffSummaryRow {
  userId: string
  userName: string
  userEmail: string | null
  role: Profile['role']
  isActive: boolean
  totalCourses: number
  completedCourses: number
  inProgressCourses: number
  overdueCourses: number
  pendingCourses: number
  lockedCourses: number
  avgScore: number | null
  completionRate: number
}

export function buildStaffSummaryRows(
  users: Profile[],
  assignments: Assignment[],
  activeCourseIds?: Set<string>
): StaffSummaryRow[] {
  return users
    .map((user) => {
      let userAssignments = assignments.filter((a) => a.user_id === user.id)
      if (activeCourseIds) {
        userAssignments = filterAssignmentsForReporting(userAssignments, activeCourseIds)
      }
      const completed = userAssignments.filter((a) => a.status === 'completed')
      const scores = completed
        .map(resolveAssignmentScore)
        .filter((s): s is number => s != null)

      return {
        userId: user.id,
        userName: user.full_name,
        userEmail: user.email,
        role: user.role,
        isActive: user.is_active,
        totalCourses: userAssignments.length,
        completedCourses: completed.length,
        inProgressCourses: userAssignments.filter((a) => a.status === 'in_progress').length,
        overdueCourses: userAssignments.filter((a) => a.status === 'overdue').length,
        pendingCourses: userAssignments.filter((a) => a.status === 'pending').length,
        lockedCourses: userAssignments.filter((a) => a.locked_at).length,
        avgScore:
          scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : null,
        completionRate:
          userAssignments.length > 0
            ? Math.round((completed.length / userAssignments.length) * 100)
            : 0,
      }
    })
    .sort((a, b) => a.userName.localeCompare(b.userName))
}

export function staffOverallStatus(
  row: StaffSummaryRow
): 'completed' | 'overdue' | 'in_progress' | 'pending' | 'none' {
  if (row.totalCourses === 0) return 'none'
  if (row.completedCourses === row.totalCourses) return 'completed'
  if (row.overdueCourses > 0) return 'overdue'
  if (row.inProgressCourses > 0 || row.completedCourses > 0) return 'in_progress'
  return 'pending'
}

export function buildStaffTrainingRows(
  assignments: Assignment[],
  users?: { id: string; full_name: string; email?: string | null }[],
  activeCourseIds?: Set<string>,
  unlockMeta?: Map<string, { count: number; pending: boolean }>
): StaffTrainingRow[] {
  const userMap = new Map(users?.map((u) => [u.id, u]) ?? [])
  const rows = activeCourseIds
    ? filterAssignmentsForReporting(assignments, activeCourseIds)
    : assignments

  return rows
    .map((a) => {
      const profile = a.user ?? userMap.get(a.user_id)
      const unlock = unlockMeta?.get(a.id)
      return {
        assignmentId: a.id,
        userId: a.user_id,
        userName: profile?.full_name ?? 'Unknown',
        userEmail: profile?.email ?? null,
        courseId: a.course_id,
        courseTitle: a.course?.title ?? 'Course',
        status: a.status,
        score: resolveAssignmentScore(a),
        attemptsUsed: a.attempts_used ?? 0,
        maxAttempts: a.course?.max_attempts ?? 3,
        locked: Boolean(a.locked_at),
        dueDate: a.due_date,
        unlockRequestCount: unlock?.count ?? 0,
        pendingUnlockRequest: unlock?.pending ?? false,
      }
    })
    .sort((a, b) => a.userName.localeCompare(b.userName) || a.courseTitle.localeCompare(b.courseTitle))
}

export interface TrainingNeed {
  courseId: string
  courseTitle: string
  moduleId: string
  moduleTitle: string
  moduleType: Module['type']
  attemptCount: number
  passRate: number
  avgScore: number
  issues: string[]
}

function modulePassed(attempt: ModuleAttempt): boolean {
  const interactions = attempt.interactions
  if (interactions && typeof interactions.passed === 'boolean') return interactions.passed
  if (attempt.score == null) return false
  const content = attempt.module?.content as { passing_score?: number } | undefined
  const passing = content?.passing_score ?? 80
  return attempt.score >= passing
}

export function extractModuleIssues(attempt: ModuleAttempt): string[] {
  const issues: string[] = []
  const i = attempt.interactions
  if (!i) return issues

  if (i.type === 'quiz' && Array.isArray(i.wrong_questions)) {
    for (const q of i.wrong_questions as { text?: string }[]) {
      if (q.text) issues.push(`Missed: ${q.text}`)
    }
  }

  if (i.type === 'sorting' && Array.isArray(i.wrong_ids)) {
    const cards = (attempt.module?.content as { config?: { cards?: { id: string; text: string }[] } })
      ?.config?.cards
    for (const id of i.wrong_ids as string[]) {
      const card = cards?.find((c) => c.id === id)
      issues.push(card ? `Mis-sorted: ${card.text}` : `Mis-sorted item ${id}`)
    }
  }

  if (i.type === 'node_map' && i.results && typeof i.results === 'object') {
    const nodes = (attempt.module?.content as { config?: { nodes?: { id: string; label: string }[] } })
      ?.config?.nodes
    for (const [nodeId, result] of Object.entries(i.results as Record<string, string>)) {
      if (result === 'wrong') {
        const node = nodes?.find((n) => n.id === nodeId)
        issues.push(node ? `Wrong at ${node.label}` : `Wrong hotspot ${nodeId}`)
      }
    }
  }

  return issues
}

export function computeTrainingNeeds(
  attempts: ModuleAttempt[],
  courses: Course[]
): TrainingNeed[] {
  const byModule = new Map<string, ModuleAttempt[]>()
  for (const attempt of attempts) {
    if (!attempt.module_id) continue
    const list = byModule.get(attempt.module_id) ?? []
    list.push(attempt)
    byModule.set(attempt.module_id, list)
  }

  const needs: TrainingNeed[] = []

  for (const [moduleId, moduleAttempts] of byModule) {
    const sample = moduleAttempts[0]
    const mod = sample.module
    if (!mod || mod.type === 'lesson') continue

    const course = courses.find((c) => c.id === mod.course_id)
    const passCount = moduleAttempts.filter(modulePassed).length
    const passRate =
      moduleAttempts.length > 0 ? Math.round((passCount / moduleAttempts.length) * 100) : 0
    const scores = moduleAttempts.filter((a) => a.score != null).map((a) => Number(a.score))
    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0

    const issueCounts = new Map<string, number>()
    for (const attempt of moduleAttempts) {
      for (const issue of extractModuleIssues(attempt)) {
        issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1)
      }
    }
    const topIssues = [...issueCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([text, count]) => (count > 1 ? `${text} (${count}×)` : text))

    if (passRate >= 80 && topIssues.length === 0) continue

    needs.push({
      courseId: mod.course_id,
      courseTitle: course?.title ?? 'Course',
      moduleId,
      moduleTitle: mod.title,
      moduleType: mod.type,
      attemptCount: moduleAttempts.length,
      passRate,
      avgScore,
      issues: topIssues.length > 0 ? topIssues : [`Low pass rate (${passRate}%)`],
    })
  }

  return needs.sort((a, b) => a.passRate - b.passRate || a.avgScore - b.avgScore)
}

export function computeCompletionRate(assignments: Assignment[]): number {
  if (assignments.length === 0) return 0
  const completed = assignments.filter((a) => a.status === 'completed').length
  return Math.round((completed / assignments.length) * 100)
}

export function computeOrgMetrics(
  orgId: string,
  users: Profile[],
  courses: Course[],
  assignments: Assignment[]
): OrgDashboardMetrics {
  const orgUsers = users.filter((u) => u.org_id === orgId)
  const orgUserIds = new Set(orgUsers.map((u) => u.id))
  const orgCourses = courses.filter((c) => c.org_id === orgId)
  const orgAssignments = assignments.filter((a) => orgUserIds.has(a.user_id))

  return {
    userCount: orgUsers.length,
    totalCourses: orgCourses.length,
    publishedCourses: orgCourses.filter((c) => c.is_published).length,
    assignmentCount: orgAssignments.length,
    completionRate: computeCompletionRate(orgAssignments),
    overdueCount: orgAssignments.filter((a) => a.status === 'overdue').length,
    inProgressCount: orgAssignments.filter((a) => a.status === 'in_progress').length,
  }
}
