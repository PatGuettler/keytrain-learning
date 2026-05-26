import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAssignment,
  deleteAssignment,
  fetchAssignments,
  updateAssignment,
} from '@/services/assignments.service'
import { useAuthStore } from '@/store/authStore'

export function useAssignments(userId?: string) {
  const uid = userId ?? useAuthStore((s) => s.userId) ?? undefined
  return useQuery({
    queryKey: ['assignments', uid],
    queryFn: () => fetchAssignments(uid),
    enabled: Boolean(uid),
  })
}

export function useAssignmentMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['assignments'] })

  return {
    create: useMutation({
      mutationFn: createAssignment,
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateAssignment>[1] }) =>
        updateAssignment(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: deleteAssignment,
      onSuccess: invalidate,
    }),
  }
}
