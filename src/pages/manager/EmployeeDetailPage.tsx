import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Award, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react'
import { fetchProfiles } from '@/services/users.service'
import { fetchAssignments } from '@/services/assignments.service'
import { formatDate } from '@/lib/utils'
import {
  buildStaffSummaryRows,
  buildStaffTrainingRows,
  staffOverallStatus,
} from '@/lib/dashboard-stats'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/dashboard/StatCard'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { StaffCourseDirectory } from '@/components/dashboard/StaffCourseDirectory'
import { exportStaffDashboardPdf } from '@/lib/pdf/dashboard-reports'
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

  const trainingRows = buildStaffTrainingRows(assignments, employee ? [employee] : [])
  const summary = useMemo(() => {
    if (!employee) return null
    return buildStaffSummaryRows([employee], assignments)[0] ?? null
  }, [employee, assignments])

  if (!employee) {
    return <p className="text-sm text-muted-foreground">Employee not found.</p>
  }

  const overall = summary ? staffOverallStatus(summary) : 'none'

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/manager/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to team dashboard
          </Link>
        </Button>
        {summary && (
          <ExportPdfButton
            onExport={() => exportStaffDashboardPdf(employee, summary, trainingRows)}
          />
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold">{employee.full_name}</h2>
        <p className="text-muted-foreground">
          {employee.email ?? 'No email'} · Joined {formatDate(employee.created_at)}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary" className="capitalize">
            {employee.role}
          </Badge>
          {summary && (
            <Badge variant={statusVariant[overall]}>{statusLabel[overall]}</Badge>
          )}
        </div>
      </div>

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
        getCourseDetailPath={(courseId) => `/manager/team/${employeeId}/courses/${courseId}`}
      />
    </div>
  )
}
