import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { fetchAssignments } from '@/services/assignments.service'
import { fetchProfiles } from '@/services/users.service'
import { useAuthStore } from '@/store/authStore'
import { buildStaffTrainingRows } from '@/lib/dashboard-stats'
import { formatAttemptsLabel } from '@/lib/course-attempts'
import { STATUS_LABELS } from '@/lib/constants'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
}

export function ManagerEmployeeDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const managerId = useAuthStore((s) => s.userId)!

  const { data: team = [] } = useQuery({
    queryKey: ['team', managerId],
    queryFn: () => fetchProfiles({ managerId }),
    enabled: Boolean(managerId),
  })

  const employee = team.find((p) => p.id === employeeId && p.role === 'employee')

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', employeeId],
    queryFn: () => fetchAssignments(employeeId!),
    enabled: Boolean(employeeId),
  })

  const courseRows = useMemo(
    () => (employee ? buildStaffTrainingRows(assignments, [employee]) : []),
    [assignments, employee]
  )

  if (!employee) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/manager/team">
            <ArrowLeft className="h-4 w-4 mr-1" />
            My Team
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Employee not found on your team.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/manager/team">
          <ArrowLeft className="h-4 w-4 mr-1" />
          My Team
        </Link>
      </Button>

      <PageHeader
        title={employee.full_name}
        description={employee.email ?? 'Team member training overview'}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading courses…</p>
      ) : courseRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assigned courses yet.</p>
      ) : (
        <div className="grid gap-3">
          {courseRows.map((row) => (
            <Card key={row.assignmentId}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{row.courseTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    Attempts: {formatAttemptsLabel(row.attemptsUsed, row.maxAttempts)}
                    {row.score != null && ` · Score: ${row.score}%`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusVariant[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                  {row.status === 'completed' && row.score != null && (
                    <Badge variant={row.score >= 80 ? 'success' : 'warning'}>
                      {row.score >= 80 ? 'Passed' : 'Failed'}
                    </Badge>
                  )}
                  {row.locked && <Badge variant="destructive">Locked</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
