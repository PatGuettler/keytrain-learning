import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Award, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react'
import { fetchAssignments } from '@/services/assignments.service'
import { fetchOrgMembers } from '@/services/users.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { StaffCourseDirectory } from '@/components/dashboard/StaffCourseDirectory'
import { Button } from '@/components/ui/button'
import { exportStaffDashboardPdf } from '@/lib/pdf/dashboard-reports'
import { Badge } from '@/components/ui/badge'
import {
  buildStaffSummaryRows,
  buildStaffTrainingRows,
  staffOverallStatus,
} from '@/lib/dashboard-stats'

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

export function AdminStaffTrainingPage() {
  const { orgId, userId } = useParams<{ orgId: string; userId: string }>()

  const { data: users = [] } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: () => fetchOrgMembers(orgId!, true),
    enabled: Boolean(orgId),
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', userId],
    queryFn: () => fetchAssignments(userId),
    enabled: Boolean(userId),
  })

  const user = users.find((u) => u.id === userId)
  const trainingRows = useMemo(
    () => buildStaffTrainingRows(assignments, user ? [user] : []),
    [assignments, user]
  )

  const summary = useMemo(() => {
    if (!user) return null
    return buildStaffSummaryRows([user], assignments)[0] ?? null
  }, [user, assignments])

  if (!user) {
    return <p className="text-sm text-muted-foreground">Staff member not found.</p>
  }

  const overall = summary ? staffOverallStatus(summary) : 'none'

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/admin/dashboard/${orgId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to hospital dashboard
          </Link>
        </Button>
        {summary && (
          <ExportPdfButton
            onExport={() => exportStaffDashboardPdf(user, summary, trainingRows)}
          />
        )}
      </div>

      <div className="space-y-2">
        <PageHeader
          title={user.full_name}
          description={user.email ?? 'Staff training record'}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {user.role}
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
        getCourseDetailPath={(courseId) =>
          `/admin/dashboard/${orgId}/staff/${userId}/courses/${courseId}`
        }
      />
    </div>
  )
}
