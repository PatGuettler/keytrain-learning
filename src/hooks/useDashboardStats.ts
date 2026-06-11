import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAssignments } from './useAssignments'
import { useCourses } from './useCourses'
import { useAuthStore } from '@/store/authStore'
import { fetchAssignmentsForManager } from '@/services/assignments.service'
import { fetchProfiles } from '@/services/users.service'
import { computeAvgScore } from '@/lib/dashboard-stats'

export function useDashboardStats(scope: 'admin' | 'manager' | 'employee') {
  const userId = useAuthStore((s) => s.userId)
  const orgId = useAuthStore((s) => s.profile?.org_id)
  const { data: ownAssignments = [] } = useAssignments(scope === 'employee' ? userId ?? undefined : undefined)

  const { data: teamAssignments = [] } = useQuery({
    queryKey: ['assignments', 'manager', userId],
    queryFn: () => fetchAssignmentsForManager(userId!),
    enabled: scope === 'manager' && Boolean(userId),
  })

  const assignments = scope === 'manager' ? teamAssignments : ownAssignments
  const { data: courses = [] } = useCourses(false)

  const { data: profiles = [] } = useQuery({
    queryKey: ['dashboard-profiles', scope, userId, orgId],
    queryFn: () =>
      fetchProfiles(
        scope === 'manager'
          ? { managerId: userId! }
          : scope === 'admin' && orgId
            ? { orgId, excludeAdmins: true }
            : scope === 'admin'
              ? { excludeAdmins: true }
              : undefined
      ),
    enabled: scope !== 'employee' && Boolean(userId),
  })

  return useMemo(() => {
    const published = courses.filter((c) => c.is_published).length
    const completed = assignments.filter((a) => a.status === 'completed').length
    const total = assignments.length || 1
    const completionRate = Math.round((completed / total) * 100)

    const teamMembers =
      scope === 'manager'
        ? profiles.filter((p) => p.manager_id === userId)
        : profiles.filter((p) => p.role === 'employee')

    return {
      totalUsers: scope === 'admin' ? profiles.length : teamMembers.length,
      totalCourses: courses.length,
      publishedCourses: published,
      completionRate,
      overdueCount: assignments.filter((a) => a.status === 'overdue').length,
      inProgressCount: assignments.filter((a) => a.status === 'in_progress').length,
      avgScore: computeAvgScore(assignments),
      recentActivity: [] as { user: string; action: string; course: string; at: string }[],
    }
  }, [assignments, courses, profiles, scope, userId])
}
