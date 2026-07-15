import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAllAssignments, fetchAssignmentsForOrg } from '@/services/assignments.service'
import { fetchCourses, fetchHospitalCourses } from '@/services/courses.service'
import { fetchHospitalOrganizations } from '@/services/organizations.service'
import { fetchProfiles } from '@/services/users.service'
import { fetchOrgModuleAttempts } from '@/services/sessions.service'
import { computeOrgMetrics, type OrgDashboardMetrics } from '@/lib/dashboard-stats'
import { countProfileStatuses } from '@/lib/user-status'
import type { Organization } from '@/types/user.types'

export interface HospitalDashboardSummary extends OrgDashboardMetrics {
  org: Organization
}

export function useAdminDashboard() {
  const { data: hospitals = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchHospitalOrganizations,
  })

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['all-org-users'],
    queryFn: () => fetchProfiles({ includeInactive: true, excludeAdmins: true }),
  })

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['hospital-courses'],
    queryFn: fetchHospitalCourses,
  })

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['all-assignments'],
    queryFn: fetchAllAssignments,
  })

  const hospitalSummaries = useMemo<HospitalDashboardSummary[]>(
    () =>
      hospitals.map((org) => ({
        org,
        ...computeOrgMetrics(org.id, users, courses, assignments),
      })),
    [hospitals, users, courses, assignments]
  )

  const platformTotals = useMemo(() => {
    const allAssignments = assignments
    const completed = allAssignments.filter((a) => a.status === 'completed').length
    const total = allAssignments.length

    const userStatusCounts = countProfileStatuses(users)

    return {
      hospitalCount: hospitals.length,
      userStatusCounts,
      activeUsers: userStatusCounts.active,
      invitedUsers: userStatusCounts.invitation_pending,
      inactiveUsers: userStatusCounts.inactive,
      lockedUsers: userStatusCounts.login_locked,
      totalUsers: users.length,
      totalCourses: courses.length,
      publishedCourses: courses.filter((c) => c.is_published).length,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      overdueCount: allAssignments.filter((a) => a.status === 'overdue').length,
    }
  }, [hospitals.length, users, courses, assignments])

  return {
    hospitals: hospitalSummaries,
    platformTotals,
    isLoading: orgsLoading || usersLoading || coursesLoading || assignmentsLoading,
  }
}

export function useOrgDashboard(orgId: string | undefined) {
  const { data: hospitals = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchHospitalOrganizations,
  })

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: () => fetchProfiles({ orgId: orgId!, includeInactive: true, excludeAdmins: true }),
    enabled: Boolean(orgId),
  })

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['courses', orgId, 'owned+published'],
    queryFn: async () => {
      const [owned, published] = await Promise.all([
        fetchCourses(orgId!, false),
        fetchCourses(orgId!, true),
      ])
      const byId = new Map(owned.map((c) => [c.id, c]))
      for (const course of published) byId.set(course.id, course)
      return [...byId.values()]
    },
    enabled: Boolean(orgId),
  })

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['org-assignments', orgId],
    queryFn: () => fetchAssignmentsForOrg(orgId!),
    enabled: Boolean(orgId),
  })

  const { data: moduleAttempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['org-module-attempts', orgId],
    queryFn: () => fetchOrgModuleAttempts(orgId!),
    enabled: Boolean(orgId),
  })

  const org = hospitals.find((h) => h.id === orgId)

  const metrics = useMemo(
    () => (orgId ? computeOrgMetrics(orgId, users, courses, assignments) : null),
    [orgId, users, courses, assignments]
  )

  return {
    org,
    users,
    courses,
    assignments,
    moduleAttempts,
    metrics,
    isLoading: usersLoading || coursesLoading || assignmentsLoading || attemptsLoading,
  }
}
