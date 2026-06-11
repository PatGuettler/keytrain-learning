import type { Assignment, Course } from '@/types/course.types'
import type { Profile } from '@/types/user.types'

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
