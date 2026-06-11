import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { fetchAssignments } from '@/services/assignments.service'
import { fetchUserModuleAttempts, fetchSessions } from '@/services/sessions.service'
import { fetchProfiles } from '@/services/users.service'
import { Button } from '@/components/ui/button'
import { StaffCourseDetailSections } from '@/components/dashboard/StaffCourseDetailSections'
import { buildStaffTrainingRows } from '@/lib/dashboard-stats'
import { useAuthStore } from '@/store/authStore'

export function ManagerStaffCourseDetailPage() {
  const { employeeId, courseId } = useParams<{ employeeId: string; courseId: string }>()
  const managerId = useAuthStore((s) => s.userId)

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['profiles', 'manager', managerId],
    queryFn: () => fetchProfiles({ managerId: managerId! }),
    enabled: Boolean(managerId),
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', employeeId],
    queryFn: () => fetchAssignments(employeeId),
    enabled: Boolean(employeeId),
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['training-sessions', employeeId],
    queryFn: () => fetchSessions(employeeId),
    enabled: Boolean(employeeId),
  })

  const { data: moduleAttempts = [] } = useQuery({
    queryKey: ['user-module-attempts', employeeId],
    queryFn: () => fetchUserModuleAttempts(employeeId!),
    enabled: Boolean(employeeId),
  })

  const employee = teamMembers.find((p) => p.id === employeeId)
  const courseRow = useMemo(() => {
    const rows = buildStaffTrainingRows(assignments, employee ? [employee] : [])
    return rows.find((r) => r.courseId === courseId) ?? null
  }, [assignments, employee, courseId])

  if (!employee) {
    return <p className="text-sm text-muted-foreground">Employee not found.</p>
  }

  if (!courseRow) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Course not found for this employee.</p>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/manager/team/${employeeId}`}>Back to employee record</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/manager/team/${employeeId}`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {employee.full_name}
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-bold">{courseRow.courseTitle}</h2>
        <p className="text-muted-foreground">
          {employee.full_name} · {employee.email ?? 'Team member'}
        </p>
      </div>

      <StaffCourseDetailSections
        courseRow={courseRow}
        sessions={sessions}
        moduleAttempts={moduleAttempts}
      />
    </div>
  )
}
