import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAssignmentsForManager } from '@/services/assignments.service'
import { fetchProfiles } from '@/services/users.service'
import { fetchOrganizationById } from '@/services/organizations.service'
import { useAuthStore } from '@/store/authStore'
import {
  buildStaffSummaryRows,
  buildStaffTrainingRows,
  computeAvgScore,
  computeCompletionRate,
  type StaffSummaryRow,
} from '@/lib/dashboard-stats'
import type { Assignment, Course } from '@/types/course.types'
import type { Profile } from '@/types/user.types'

function coursesFromAssignments(assignments: Assignment[]): Course[] {
  const byId = new Map<string, Course>()
  for (const a of assignments) {
    if (a.course) byId.set(a.course_id, a.course)
  }
  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title))
}

export function useManagerTrainingReports() {
  const managerId = useAuthStore((s) => s.userId)
  const orgId = useAuthStore((s) => s.profile?.org_id)

  const { data: team = [], isLoading: teamLoading } = useQuery({
    queryKey: ['team', managerId],
    queryFn: () => fetchProfiles({ managerId: managerId! }),
    enabled: Boolean(managerId),
  })

  const employees = useMemo(
    () => team.filter((p) => p.role === 'employee'),
    [team]
  )

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments', 'manager', managerId, 'reports'],
    queryFn: () => fetchAssignmentsForManager(managerId!),
    enabled: Boolean(managerId),
  })

  const { data: organization } = useQuery({
    queryKey: ['profile-organization', orgId],
    queryFn: () => fetchOrganizationById(orgId!),
    enabled: Boolean(orgId),
  })

  const courses = useMemo(() => coursesFromAssignments(assignments), [assignments])

  const staffSummaries = useMemo<StaffSummaryRow[]>(
    () => buildStaffSummaryRows(employees, assignments),
    [employees, assignments]
  )

  const avgScore = useMemo(() => computeAvgScore(assignments), [assignments])
  const completionRate = useMemo(() => computeCompletionRate(assignments), [assignments])

  const metrics = useMemo(
    () => ({
      teamCount: employees.length,
      courseCount: courses.length,
      assignmentCount: assignments.length,
      completionRate,
      overdueCount: assignments.filter((a) => a.status === 'overdue').length,
      inProgressCount: assignments.filter((a) => a.status === 'in_progress').length,
    }),
    [employees.length, courses.length, assignments, completionRate]
  )

  return {
    managerId,
    organization,
    employees,
    team: employees as Profile[],
    courses,
    assignments,
    staffSummaries,
    avgScore,
    metrics,
    isLoading: teamLoading || assignmentsLoading,
  }
}

export function useManagerCourseReport(courseId: string | undefined) {
  const {
    organization,
    team,
    courses,
    assignments,
    isLoading,
  } = useManagerTrainingReports()

  const course = courses.find((c) => c.id === courseId)

  const staffRows = useMemo(
    () =>
      buildStaffTrainingRows(assignments, team).filter((row) => row.courseId === courseId),
    [assignments, team, courseId]
  )

  const courseAssignments = useMemo(
    () => assignments.filter((a) => a.course_id === courseId),
    [assignments, courseId]
  )

  return {
    organization,
    course,
    staffRows,
    courseAssignments,
    isLoading,
  }
}
