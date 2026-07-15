import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Award, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react'
import { fetchAssignments } from '@/services/assignments.service'
import { fetchProfile } from '@/services/auth.service'
import { fetchOrganizationById } from '@/services/organizations.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { StaffCourseDirectory } from '@/components/dashboard/StaffCourseDirectory'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  buildStaffSummaryRows,
  buildStaffTrainingRows,
  staffOverallStatus,
} from '@/lib/dashboard-stats'

export function OrgAdminStaffTrainingPage() {
  const { userId } = useParams<{ userId: string }>()

  const { data: user } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
    retry: false,
  })

  const { data: org } = useQuery({
    queryKey: ['organization', user?.org_id],
    queryFn: () => fetchOrganizationById(user!.org_id),
    enabled: Boolean(user?.org_id),
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', userId],
    queryFn: () => fetchAssignments(userId),
    enabled: Boolean(userId),
  })

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
  const statusVariant =
    overall === 'completed'
      ? 'success'
      : overall === 'overdue'
        ? 'destructive'
        : overall === 'in_progress'
          ? 'default'
          : 'secondary'

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/org-admin/training-reports">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to training reports
        </Link>
      </Button>

      <PageHeader
        title={user.full_name}
        description={`${org?.name ?? 'Organization'} · ${user.email ?? 'No email'}`}
        action={<Badge variant={statusVariant as 'success' | 'destructive' | 'default' | 'secondary'}>
          {overall === 'completed'
            ? 'All complete'
            : overall === 'overdue'
              ? 'Overdue'
              : overall === 'in_progress'
                ? 'In progress'
                : overall === 'pending'
                  ? 'Not started'
                  : 'No courses'}
        </Badge>}
      />

      {summary ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard title="Courses" value={summary.totalCourses} icon={BookOpen} />
          <StatCard
            title="Completion"
            value={`${summary.completionRate}%`}
            icon={TrendingUp}
          />
          <StatCard
            title="Avg score"
            value={summary.avgScore != null ? `${summary.avgScore}%` : '—'}
            icon={Award}
          />
          <StatCard title="Overdue" value={summary.overdueCourses} icon={AlertTriangle} />
        </div>
      ) : null}

      <StaffCourseDirectory rows={trainingRows} />
    </div>
  )
}
