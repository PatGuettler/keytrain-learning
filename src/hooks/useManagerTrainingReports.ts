import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAssignmentHistoryForManager } from '@/services/assignments.service'
import { fetchProfiles } from '@/services/users.service'
import { fetchOrganizationById } from '@/services/organizations.service'
import { fetchPublicationsForOrg } from '@/services/course-publications.service'
import { useAuthStore } from '@/store/authStore'
import { activePublicationCourseIds } from '@/lib/course-publications'
import {
  buildStaffSummaryRowsFromGradeHistory,
  buildStaffTrainingRows,
  computeAvgScoreFromGradeHistory,
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

  const employeeIds = useMemo(() => new Set(employees.map((e) => e.id)), [employees])

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments', 'manager', managerId, 'reports', 'history'],
    queryFn: () => fetchAssignmentHistoryForManager(managerId!),
    enabled: Boolean(managerId),
  })

  /** Only current direct-report employees — excludes stale rows after org moves. */
  const teamAssignments = useMemo(
    () => assignments.filter((a) => employeeIds.has(a.user_id)),
    [assignments, employeeIds]
  )

  const { data: organization } = useQuery({
    queryKey: ['profile-organization', orgId],
    queryFn: () => fetchOrganizationById(orgId!),
    enabled: Boolean(orgId),
  })

  const { data: publications = [] } = useQuery({
    queryKey: ['publications', orgId],
    queryFn: () => fetchPublicationsForOrg(orgId!),
    enabled: Boolean(orgId),
  })

  const activeCourseIds = useMemo(
    () => activePublicationCourseIds(publications),
    [publications]
  )

  const courses = useMemo(() => coursesFromAssignments(teamAssignments), [teamAssignments])

  const staffSummaries = useMemo<StaffSummaryRow[]>(
    () => buildStaffSummaryRowsFromGradeHistory(employees, teamAssignments, activeCourseIds),
    [employees, teamAssignments, activeCourseIds]
  )

  const avgScore = useMemo(
    () => computeAvgScoreFromGradeHistory(teamAssignments, activeCourseIds),
    [teamAssignments, activeCourseIds]
  )
  const completionRate = useMemo(() => computeCompletionRate(teamAssignments), [teamAssignments])

  const metrics = useMemo(
    () => ({
      teamCount: employees.length,
      courseCount: courses.length,
      assignmentCount: teamAssignments.length,
      completionRate,
      overdueCount: teamAssignments.filter((a) => a.status === 'overdue').length,
      inProgressCount: teamAssignments.filter((a) => a.status === 'in_progress').length,
    }),
    [employees.length, courses.length, teamAssignments, completionRate]
  )

  return {
    managerId,
    organization,
    employees,
    team: employees as Profile[],
    courses,
    assignments: teamAssignments,
    staffSummaries,
    avgScore,
    metrics,
    publications,
    activeCourseIds,
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
