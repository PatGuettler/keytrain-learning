import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { syncRequiredAssignmentsForUser } from '@/services/assignments.service'
import { useAuthStore } from '@/store/authStore'

/** Keeps staff assignments in sync with active published courses (on load and after org change). */
export function useRequiredAssignmentSync() {
  const userId = useAuthStore((s) => s.userId)
  const role = useAuthStore((s) => s.profile?.role)
  const orgId = useAuthStore((s) => s.profile?.org_id)
  const queryClient = useQueryClient()
  const syncedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!userId || !role || role === 'admin' || !orgId) return
    const key = `${userId}:${orgId}`
    if (syncedFor.current === key) return

    syncedFor.current = key
    void syncRequiredAssignmentsForUser(userId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['assignments'] })
        void queryClient.invalidateQueries({ queryKey: ['courses'] })
      })
      .catch(() => {
        syncedFor.current = null
      })
  }, [userId, role, orgId, queryClient])
}
