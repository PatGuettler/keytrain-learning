import { useQuery } from '@tanstack/react-query'
import { fetchCourse, fetchCourses, fetchLearnerCourse, fetchModules } from '@/services/courses.service'
import { useAuthStore } from '@/store/authStore'

const LIVE_COURSE_QUERY = {
  staleTime: 0,
  refetchOnMount: 'always' as const,
}

export function useCourses(publishedOnly = false) {
  const orgId = useAuthStore((s) => s.profile?.org_id)
  return useQuery({
    queryKey: ['courses', orgId, publishedOnly],
    queryFn: () => fetchCourses(orgId!, publishedOnly),
    enabled: Boolean(orgId),
    ...(publishedOnly ? LIVE_COURSE_QUERY : {}),
  })
}

export function useCourse(courseId: string) {
  const role = useAuthStore((s) => s.profile?.role)
  const orgId = useAuthStore((s) => s.profile?.org_id)
  const isLearner = role === 'employee' || role === 'manager'

  return useQuery({
    queryKey: ['course', courseId, isLearner ? orgId : 'admin'],
    queryFn: () =>
      isLearner && orgId ? fetchLearnerCourse(courseId, orgId) : fetchCourse(courseId),
    enabled: Boolean(courseId) && (!isLearner || Boolean(orgId)),
    ...(isLearner ? LIVE_COURSE_QUERY : {}),
  })
}

export function useModules(courseId: string) {
  const role = useAuthStore((s) => s.profile?.role)
  const isLearner = role === 'employee' || role === 'manager'

  return useQuery({
    queryKey: ['modules', courseId],
    queryFn: () => fetchModules(courseId),
    enabled: Boolean(courseId),
    ...(isLearner ? LIVE_COURSE_QUERY : {}),
  })
}
