import { useState } from 'react'
import { useCourses } from '@/hooks/useCourses'
import { useAssignmentMutations } from '@/hooks/useAssignments'
import { fetchProfiles } from '@/services/users.service'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export function AssignmentsPage() {
  const userId = useAuthStore((s) => s.userId)!
  const { data: courses = [] } = useCourses(true)
  const { create } = useAssignmentMutations()
  const { data: team = [] } = useQuery({
    queryKey: ['team-assign', userId],
    queryFn: () => fetchProfiles({ managerId: userId }),
  })
  const [courseId, setCourseId] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  const employees = team.filter((p) => p.role === 'employee')

  const assign = () => {
    if (!courseId || !employeeId) return
    create.mutate({
      course_id: courseId,
      user_id: employeeId,
      assigned_by: userId,
    })
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-2xl font-bold">Assign Training</h2>
      <Card>
        <CardHeader>
          <CardTitle>New Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <select
              className="w-full h-10 rounded-md border px-3 text-sm"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Course</Label>
            <select
              className="w-full h-10 rounded-md border px-3 text-sm"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={assign} disabled={!courseId || !employeeId}>
            Assign Course
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
