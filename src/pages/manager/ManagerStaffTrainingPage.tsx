import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Award, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react'
import { fetchAssignmentsForManager } from '@/services/assignments.service'
import { fetchProfiles } from '@/services/users.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { StaffCourseDirectory } from '@/components/dashboard/StaffCourseDirectory'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { exportStaffDashboardPdf } from '@/lib/pdf/dashboard-reports'
import {
  buildStaffSummaryRows,
  buildStaffTrainingRows,
  staffOverallStatus,
} from '@/lib/dashboard-stats'
import { useAuthStore } from '@/store/authStore'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  completed: 'success',
  in_progress: 'default',
  pending: 'secondary',
  overdue: 'destructive',
  none: 'secondary',
}

const statusLabel: Record<string, string> = {
  completed: 'All complete',
  in_progress: 'In progress',
  pending: 'Not started',
  overdue: 'Overdue',
  none: 'No courses',
}

export function ManagerStaffTrainingPage({
  backPath = '/manager/reports',
  backLabel = 'Training reports',
  courseDetailPathPrefix = '/manager/reports/staff',
}: {
  backPath?: string
  backLabel?: string
  /** Path prefix before `/:userId/courses/:courseId` */
  courseDetailPathPrefix?: string
}) {
  const { userId: employeeId } = useParams<{ userId: string }>()
  const managerId = useAuthStore((s) => s.userId)

  const { data: team = [] } = useQuery({
    queryKey: ['team', managerId],
    queryFn: () => fetchProfiles({ managerId: managerId! }),
    enabled: Boolean(managerId),
  })

  const employee = team.find((p) => p.id === employeeId && p.role === 'employee')

  const { data: allTeamAssignments = [], isLoading } = useQuery({
    queryKey: ['assignments', 'manager', managerId, 'reports'],
    queryFn: () => fetchAssignmentsForManager(managerId!),
    enabled: Boolean(managerId),
  })

  const assignments = useMemo(
    () => allTeamAssignments.filter((a) => a.user_id === employeeId),
    [allTeamAssignments, employeeId]
  )

  const trainingRows = useMemo(
    () => (employee ? buildStaffTrainingRows(assignments, [employee]) : []),
    [assignments, employee]
  )

  const summary = useMemo(() => {
    if (!employee) return null
    return buildStaffSummaryRows([employee], assignments)[0] ?? null
  }, [employee, assignments])

  if (!employee) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={backPath}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Employee not found on your team.</p>
      </div>
    )
  }

  const overall = summary ? staffOverallStatus(summary) : 'none'

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={backPath}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Link>
        </Button>
        {summary && (
          <ExportPdfButton
            allowNonAdmin
            label="Download report (PDF)"
            onExport={() => exportStaffDashboardPdf(employee, summary, trainingRows)}
          />
        )}
      </div>

      <div className="space-y-2">
        <PageHeader
          title={employee.full_name}
          description={employee.email ?? 'Team member training record'}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Employee</Badge>
          {summary && <Badge variant={statusVariant[overall]}>{statusLabel[overall]}</Badge>}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading courses…</p>
      ) : (
        <>
          {summary && (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Courses complete"
                value={`${summary.completedCourses}/${summary.totalCourses}`}
                icon={BookOpen}
              />
              <StatCard title="Completion rate" value={`${summary.completionRate}%`} icon={TrendingUp} />
              <StatCard
                title="Avg score"
                value={summary.avgScore != null ? `${summary.avgScore}%` : '—'}
                icon={Award}
              />
              <StatCard title="Overdue" value={summary.overdueCourses} icon={AlertTriangle} />
            </div>
          )}

          <StaffCourseDirectory
            rows={trainingRows}
            getCourseDetailPath={(courseId) =>
              `${courseDetailPathPrefix}/${employeeId}/courses/${courseId}`
            }
          />
        </>
      )}
    </div>
  )
}
