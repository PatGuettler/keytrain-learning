import { useMemo } from 'react'
import { useAssignments } from './useAssignments'
import { useCourses } from './useCourses'
import { useAuthStore } from '@/store/authStore'
import { demoProfiles } from '@/services/demo-data'
import { isSupabaseConfigured } from '@/services/supabase'

export function useDashboardStats(scope: 'admin' | 'manager' | 'employee') {
  const userId = useAuthStore((s) => s.userId)
  const { data: assignments = [] } = useAssignments(scope === 'employee' ? userId ?? undefined : undefined)
  const { data: courses = [] } = useCourses(false)

  return useMemo(() => {
    const totalUsers = isSupabaseConfigured ? 0 : demoProfiles.length
    const published = courses.filter((c) => c.is_published).length
    const completed = assignments.filter((a) => a.status === 'completed').length
    const total = assignments.length || 1
    const completionRate = Math.round((completed / total) * 100)

    const teamMembers =
      scope === 'manager'
        ? demoProfiles.filter((p) => p.manager_id === userId)
        : demoProfiles.filter((p) => p.role === 'employee')

    return {
      totalUsers: scope === 'admin' ? totalUsers : teamMembers.length,
      totalCourses: courses.length,
      publishedCourses: published,
      completionRate,
      overdueCount: assignments.filter((a) => a.status === 'overdue').length,
      inProgressCount: assignments.filter((a) => a.status === 'in_progress').length,
      avgScore: 87,
      recentActivity: [
        { user: 'Sam Taylor', action: 'completed', course: 'Clinical Incident Reporting', at: '2h ago' },
        { user: 'Jordan Chen', action: 'assigned', course: 'Cybersecurity Awareness', at: '5h ago' },
      ],
    }
  }, [assignments, courses, scope, userId])
}
