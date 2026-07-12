import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createAssignment } from '@/services/assignments.service'
import { fetchCourses } from '@/services/courses.service'
import { useAuthStore } from '@/store/authStore'

/** Manager (or org_admin) assigns a published course to one learner. */
export function AssignCourseToUserCard({
  userId,
  orgId,
}: {
  userId: string
  orgId: string
}) {
  const assignedBy = useAuthStore((s) => s.userId)!
  const queryClient = useQueryClient()
  const [courseId, setCourseId] = useState('')
  const [error, setError] = useState('')

  const { data: courses = [] } = useQuery({
    queryKey: ['courses', orgId, true],
    queryFn: () => fetchCourses(orgId, true),
    enabled: Boolean(orgId),
  })

  const mutation = useMutation({
    mutationFn: () =>
      createAssignment({
        course_id: courseId,
        user_id: userId,
        assigned_by: assignedBy,
      }),
    onSuccess: async () => {
      setError('')
      setCourseId('')
      await queryClient.invalidateQueries({ queryKey: ['assignments', userId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (e: Error) => setError(e.message),
  })

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          No published courses available to assign yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assign training</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="assign-course">Course</Label>
          <select
            id="assign-course"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">Select a course…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!courseId || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Plus className="h-4 w-4 mr-1" />
          {mutation.isPending ? 'Assigning…' : 'Assign course'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
