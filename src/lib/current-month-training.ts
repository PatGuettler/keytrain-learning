import { resolveAssignmentScore } from '@/lib/dashboard-stats'
import type { Assignment } from '@/types/course.types'
import type { Profile } from '@/types/user.types'

export function isInCurrentMonth(iso: string | null | undefined, now = new Date()): boolean {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export function currentMonthLabel(now = new Date()): string {
  return now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/**
 * Current-month training rows:
 * - monthly catalog courses that are incomplete, or completed/assigned this month
 * - any other assignment assigned or due this month
 */
export function isCurrentMonthTrainingAssignment(
  assignment: Assignment,
  now = new Date()
): boolean {
  const monthly = Boolean(assignment.course?.is_monthly_catalog)
  if (monthly) {
    if (assignment.status === 'completed') {
      return (
        isInCurrentMonth(assignment.completed_at, now) ||
        isInCurrentMonth(assignment.assigned_at, now)
      )
    }
    return true
  }
  return (
    isInCurrentMonth(assignment.assigned_at, now) || isInCurrentMonth(assignment.due_date, now)
  )
}

export type MonthTrainingResponseRow = {
  assignmentId: string
  userId: string
  userName: string
  userEmail: string | null
  orgId: string
  orgName: string
  courseId: string
  courseTitle: string
  status: Assignment['status']
  score: number | null
  responded: boolean
}

export function buildCurrentMonthTrainingRows(
  assignments: Assignment[],
  users: Profile[],
  orgNameById: Map<string, string>,
  now = new Date()
): MonthTrainingResponseRow[] {
  const userById = new Map(users.map((u) => [u.id, u]))

  return assignments
    .filter((a) => isCurrentMonthTrainingAssignment(a, now))
    .map((a) => {
      const profile = userById.get(a.user_id)
      const userName = profile?.full_name ?? a.user?.full_name ?? 'Unknown'
      const userEmail = profile?.email ?? a.user?.email ?? null
      const orgId = profile?.org_id ?? ''
      const responded = a.status === 'completed'
      return {
        assignmentId: a.id,
        userId: a.user_id,
        userName,
        userEmail,
        orgId,
        orgName: orgNameById.get(orgId) ?? 'Organization',
        courseId: a.course_id,
        courseTitle: a.course?.title ?? 'Course',
        status: a.status,
        score: responded ? resolveAssignmentScore(a) : null,
        responded,
      }
    })
    .sort((a, b) => {
      if (a.responded !== b.responded) return a.responded ? 1 : -1
      return (
        a.orgName.localeCompare(b.orgName) ||
        a.userName.localeCompare(b.userName) ||
        a.courseTitle.localeCompare(b.courseTitle)
      )
    })
}
