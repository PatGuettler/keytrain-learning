import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acknowledgeCourseNotice,
  fetchUnacknowledgedNotices,
} from '@/services/course-publications.service'
import { useAuthStore } from '@/store/authStore'

export function useNewCourseNotices() {
  const userId = useAuthStore((s) => s.userId)
  const orgId = useAuthStore((s) => s.profile?.org_id)
  const role = useAuthStore((s) => s.profile?.role)
  const queryClient = useQueryClient()

  const enabled = Boolean(userId && orgId && role && role !== 'admin')

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['course-notices', userId, orgId],
    queryFn: () => fetchUnacknowledgedNotices(userId!, orgId!),
    enabled,
  })

  const dismissNotice = async (publicationId: string) => {
    if (!userId) return
    await acknowledgeCourseNotice(publicationId, userId)
    await queryClient.invalidateQueries({ queryKey: ['course-notices', userId, orgId] })
  }

  return { notices, isLoading, dismissNotice, enabled }
}
