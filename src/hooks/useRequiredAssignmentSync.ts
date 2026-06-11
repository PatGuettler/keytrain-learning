import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { syncRequiredAssignmentsForUser } from '@/services/assignments.service'
import { useAuthStore } from '@/store/authStore'

/** Keeps staff assignments in sync with active published courses (on load and after login). */
export function useRequiredAssignmentSync() {
  const userId = useAuthStore((s) => s.userId)
  const role = useAuthStore((s) => s.profile?.role)
  const queryClient = useQueryClient()
  const syncedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!userId || !role || role === 'admin') return
    if (syncedFor.current === userId) return

    syncedFor.current = userId
    void syncRequiredAssignmentsForUser(userId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['assignments'] })
    })
  }, [userId, role, queryClient])
}
