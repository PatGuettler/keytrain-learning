import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { assignCourseRetake } from '@/services/assignments.service'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import type { StaffTrainingRow } from '@/lib/dashboard-stats'

export function AssignCourseRetakeButton({
  courseRow,
  userId,
}: {
  courseRow: StaffTrainingRow
  userId: string
}) {
  const adminId = useAuthStore((s) => s.userId)!
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canAssign = courseRow.status === 'completed' || courseRow.locked

  if (!canAssign) return null

  const handleAssign = async () => {
    const label =
      courseRow.status === 'completed'
        ? `Assign another attempt for "${courseRow.courseTitle}"? The learner will be able to take the course again. Previous attempt history is kept.`
        : `Allow another attempt for "${courseRow.courseTitle}"? This will unlock the course for the learner.`
    if (!window.confirm(label)) return

    setLoading(true)
    setError('')
    try {
      await assignCourseRetake(courseRow.assignmentId, adminId)
      await queryClient.invalidateQueries({ queryKey: ['assignments', userId] })
      await queryClient.invalidateQueries({ queryKey: ['training-sessions', userId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign retake')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void handleAssign()}>
        <RotateCcw className="h-4 w-4 mr-2" />
        {loading ? 'Assigning…' : 'Assign another attempt'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
