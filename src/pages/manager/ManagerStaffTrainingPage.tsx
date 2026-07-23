import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Award, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react'
import { fetchProfiles } from '@/services/users.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { GradeHistoryPanel, useGradeHistorySummary } from '@/components/training/GradeHistoryPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { exportStaffDashboardPdf } from '@/lib/pdf/dashboard-reports'
import { buildStaffTrainingRows, staffOverallStatus } from '@/lib/dashboard-stats'
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
  courseDetailPathPrefix?: string
}) {
  const navigate = useNavigate()
  const { userId, employeeId: teamEmployeeId } = useParams<{
    userId?: string
    employeeId?: string
  }>()
  const employeeId = userId ?? teamEmployeeId
  const managerId = useAuthStore((s) => s.userId)
  const orgId = useAuthStore((s) => s.profile?.org_id)

  const { data: team = [], isLoading: teamLoading } = useQuery({
    queryKey: ['team', managerId],
    queryFn: () => fetchProfiles({ managerId: managerId! }),
    enabled: Boolean(managerId),
  })

  const employee = team.find((p) => p.id === employeeId && p.role === 'employee')

  const { assignments, summary, isLoading } = useGradeHistorySummary(employeeId, orgId)

  const trainingRows = employee ? buildStaffTrainingRows(assignments, [employee]) : []

  const overallStatus = summary
    ? staffOverallStatus({
        userId: employeeId!,
        userName: employee?.full_name ?? '',
        userEmail: employee?.email ?? null,
        role: 'employee',
        isActive: true,
        totalCourses: summary.totalCourses,
        completedCourses: summary.completedCourses,
        inProgressCourses: 0,
        overdueCourses: summary.overdueCourses,
        pendingCourses: 0,
        lockedCourses: 0,
        currentMonthOpen: 0,
        avgScore: summary.avgScore,
        completionRate: summary.completionRate,
      })
    : 'none'

  if (teamLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={backPath}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Loading employee…</p>
      </div>
    )
  }

  if (!employeeId || !employee) {
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

  const pdfSummary = {
    userId: employee.id,
    userName: employee.full_name,
    userEmail: employee.email,
    role: employee.role,
    isActive: employee.is_active,
    totalCourses: summary.totalCourses,
    completedCourses: summary.completedCourses,
    inProgressCourses: trainingRows.filter((r) => r.status === 'in_progress').length,
    overdueCourses: summary.overdueCourses,
    pendingCourses: trainingRows.filter((r) => r.status === 'pending').length,
    lockedCourses: trainingRows.filter((r) => r.locked).length,
    currentMonthOpen: 0,
    avgScore: summary.avgScore,
    completionRate: summary.completionRate,
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={backPath}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Link>
        </Button>
        <ExportPdfButton
          allowNonAdmin
          label="Download report (PDF)"
          onExport={() => exportStaffDashboardPdf(employee, pdfSummary, trainingRows)}
        />
      </div>

      <div className="space-y-2">
        <PageHeader
          title={employee.full_name}
          description="All courses assigned — available, completed, expired, and closed training."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Employee</Badge>
          <Badge variant={statusVariant[overallStatus]}>{statusLabel[overallStatus]}</Badge>
        </div>
      </div>

      {!isLoading && summary.totalCourses > 0 && (
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
          <StatCard title="Overdue / expired" value={summary.overdueCourses} icon={AlertTriangle} />
        </div>
      )}

      {employeeId && (
        <GradeHistoryPanel
          userId={employeeId}
          orgId={orgId}
          onCourseClick={(courseId) =>
            navigate(`${courseDetailPathPrefix}/${employeeId}/courses/${courseId}`)
          }
        />
      )}
    </div>
  )
}
