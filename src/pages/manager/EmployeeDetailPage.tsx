import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { fetchProfiles } from '@/services/users.service'
import { fetchAssignments } from '@/services/assignments.service'
import { fetchSessions, fetchUserModuleAttempts } from '@/services/sessions.service'
import { formatDate } from '@/lib/utils'
import { buildStaffTrainingRows } from '@/lib/dashboard-stats'
import { Button } from '@/components/ui/button'
import { StaffTrainingDetailSections } from '@/components/dashboard/StaffTrainingDetailSections'
import { useAuthStore } from '@/store/authStore'

export function EmployeeDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const managerId = useAuthStore((s) => s.userId)

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['profiles', 'manager', managerId],
    queryFn: () => fetchProfiles({ managerId: managerId! }),
    enabled: Boolean(managerId),
  })

  const employee = teamMembers.find((p) => p.id === employeeId)

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

  const trainingRows = buildStaffTrainingRows(assignments, employee ? [employee] : [])

  if (!employee) {
    return <p className="text-sm text-muted-foreground">Employee not found.</p>
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/manager/dashboard">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to team dashboard
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-bold">{employee.full_name}</h2>
        <p className="text-muted-foreground">
          {employee.email ?? 'No email'} · Joined {formatDate(employee.created_at)}
        </p>
      </div>

      <StaffTrainingDetailSections
        trainingRows={trainingRows}
        sessions={sessions}
        moduleAttempts={moduleAttempts}
      />
    </div>
  )
}
