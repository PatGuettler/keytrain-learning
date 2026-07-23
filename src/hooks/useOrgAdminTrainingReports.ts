import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchAssignmentsForOrg } from '@/services/assignments.service'
import { fetchCourses } from '@/services/courses.service'
import { fetchMyOrgMemberships } from '@/services/org-memberships.service'
import { fetchProfiles } from '@/services/users.service'
import { buildStaffSummaryRows, computeAvgScore, computeOrgMetrics } from '@/lib/dashboard-stats'
import { isPublicationActive } from '@/lib/course-publications'
import { fetchPublicationsForOrg } from '@/services/course-publications.service'
import { useAuthStore } from '@/store/authStore'
import type { Assignment, Course, CoursePublication } from '@/types/course.types'
import type { Organization, Profile } from '@/types/user.types'

export type OrgFilterId = 'all' | string

export function useOrgAdminTrainingReports() {
  const userId = useAuthStore((s) => s.userId)
  const activeOrgId = useAuthStore((s) => s.profile?.org_id)
  const [orgFilter, setOrgFilter] = useState<OrgFilterId>(activeOrgId ?? 'all')

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['my-org-memberships', userId],
    queryFn: fetchMyOrgMemberships,
    enabled: Boolean(userId),
  })

  const adminOrgs = useMemo(() => {
    const orgs: Organization[] = []
    for (const m of memberships) {
      if (m.role !== 'org_admin' || !m.is_active || !m.organization) continue
      orgs.push(m.organization)
    }
    return orgs.sort((a, b) => a.name.localeCompare(b.name))
  }, [memberships])

  const selectedOrgIds = useMemo(() => {
    if (orgFilter === 'all') return adminOrgs.map((o) => o.id)
    return adminOrgs.some((o) => o.id === orgFilter) ? [orgFilter] : adminOrgs.map((o) => o.id)
  }, [orgFilter, adminOrgs])

  const orgNameById = useMemo(
    () => new Map(adminOrgs.map((o) => [o.id, o.name])),
    [adminOrgs]
  )

  const perOrgQueries = useQueries({
    queries: selectedOrgIds.map((orgId) => ({
      queryKey: ['org-admin-training', orgId],
      queryFn: async () => {
        const [users, ownedCourses, publishedCourses, assignments, publications] = await Promise.all([
          fetchProfiles({ orgId, includeInactive: true, excludeAdmins: true }),
          fetchCourses(orgId, false),
          fetchCourses(orgId, true),
          fetchAssignmentsForOrg(orgId),
          fetchPublicationsForOrg(orgId),
        ])
        const courseById = new Map<string, Course>()
        for (const c of [...ownedCourses, ...publishedCourses]) courseById.set(c.id, c)
        return {
          orgId,
          users,
          courses: [...courseById.values()],
          assignments,
          publications,
        }
      },
      enabled: selectedOrgIds.length > 0,
    })),
  })

  const isLoading =
    membershipsLoading || perOrgQueries.some((q) => q.isLoading || q.isFetching)

  const aggregated = useMemo(() => {
    const users: Profile[] = []
    const courses: Course[] = []
    const assignments: Assignment[] = []
    const publications: CoursePublication[] = []
    const courseIds = new Set<string>()
    const publicationKeys = new Set<string>()

    for (const q of perOrgQueries) {
      if (!q.data) continue
      users.push(...q.data.users)
      for (const c of q.data.courses) {
        if (courseIds.has(c.id)) continue
        courseIds.add(c.id)
        courses.push(c)
      }
      assignments.push(...q.data.assignments)
      for (const p of q.data.publications) {
        const key = `${p.org_id}:${p.course_id}`
        if (publicationKeys.has(key)) continue
        publicationKeys.add(key)
        publications.push(p)
      }
    }

    return { users, courses, assignments, publications }
  }, [perOrgQueries])

  const metrics = useMemo(() => {
    if (orgFilter !== 'all' && selectedOrgIds.length === 1) {
      return computeOrgMetrics(
        selectedOrgIds[0],
        aggregated.users,
        aggregated.courses,
        aggregated.assignments,
        aggregated.publications
      )
    }
    const completed = aggregated.assignments.filter((a) => a.status === 'completed').length
    const total = aggregated.assignments.length
    return {
      userCount: aggregated.users.length,
      totalCourses: aggregated.courses.length,
      publishedCourses: aggregated.courses.filter((c) =>
        aggregated.publications.some((p) => p.course_id === c.id && isPublicationActive(p))
      ).length,
      assignmentCount: total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      overdueCount: aggregated.assignments.filter((a) => a.status === 'overdue').length,
      inProgressCount: aggregated.assignments.filter((a) => a.status === 'in_progress').length,
    }
  }, [aggregated, orgFilter, selectedOrgIds])

  const staffSummaries = useMemo(
    () =>
      buildStaffSummaryRows(
        aggregated.users,
        aggregated.assignments,
        undefined,
        orgNameById
      ),
    [aggregated.users, aggregated.assignments, orgNameById]
  )

  const avgScore = useMemo(
    () => computeAvgScore(aggregated.assignments),
    [aggregated.assignments]
  )

  const selectedOrg =
    orgFilter === 'all' ? null : adminOrgs.find((o) => o.id === orgFilter) ?? null

  return {
    adminOrgs,
    orgFilter,
    setOrgFilter,
    selectedOrg,
    showOrgColumn: orgFilter === 'all' || selectedOrgIds.length > 1,
    users: aggregated.users,
    courses: aggregated.courses,
    assignments: aggregated.assignments,
    publications: aggregated.publications,
    metrics,
    staffSummaries,
    avgScore,
    isLoading,
  }
}
