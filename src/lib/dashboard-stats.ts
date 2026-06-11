import type { Assignment, Course, TrainingSession } from '@/types/course.types'
import type { Profile } from '@/types/user.types'

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

export function computeCourseMetrics(courses: Course[], assignments: Assignment[]): CourseMetrics[] {
  return courses.map((course) => {
    const courseAssignments = assignments.filter((a) => a.course_id === course.id)
    const completedCount = courseAssignments.filter((a) => a.status === 'completed').length

    return {
      course,
      assignmentCount: courseAssignments.length,
      completedCount,
      inProgressCount: courseAssignments.filter((a) => a.status === 'in_progress').length,
      overdueCount: courseAssignments.filter((a) => a.status === 'overdue').length,
      completionRate:
        courseAssignments.length > 0 ? Math.round((completedCount / courseAssignments.length) * 100) : 0,
    }
  })
}
