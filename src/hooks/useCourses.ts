import { useQuery } from '@tanstack/react-query'
import { fetchCourse, fetchCourses, fetchModules } from '@/services/courses.service'
import { useAuthStore } from '@/store/authStore'

export function useCourses(publishedOnly = false) {
  const orgId = useAuthStore((s) => s.profile?.org_id)
  return useQuery({
    queryKey: ['courses', orgId, publishedOnly],
    queryFn: () => fetchCourses(orgId!, publishedOnly),
    enabled: Boolean(orgId),
  })
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourse(courseId),
    enabled: Boolean(courseId),
  })
}

export function useModules(courseId: string) {
  return useQuery({
    queryKey: ['modules', courseId],
    queryFn: () => fetchModules(courseId),
    enabled: Boolean(courseId),
  })
}
