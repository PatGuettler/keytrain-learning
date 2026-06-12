import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Award, BookOpen, Building2, TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { CompletionChart } from '@/components/dashboard/CompletionChart'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { OrgCourseTable } from '@/components/dashboard/OrgCourseTable'
import { OrgStaffDirectory } from '@/components/dashboard/OrgStaffDirectory'
import { OrgTrainingNeedsPanel } from '@/components/dashboard/OrgTrainingNeedsPanel'
import { StatCard } from '@/components/dashboard/StatCard'
import { exportOrgDashboardPdf } from '@/lib/pdf/dashboard-reports'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useOrgDashboard } from '@/hooks/useAdminDashboard'
import { buildStaffSummaryRows, computeAvgScore, computeTrainingNeeds } from '@/lib/dashboard-stats'

export function HospitalDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const { org, users, courses, assignments, moduleAttempts, metrics, isLoading } = useOrgDashboard(orgId)

  const staffSummaries = buildStaffSummaryRows(users, assignments)
  const trainingNeeds = computeTrainingNeeds(moduleAttempts, courses)
  const avgScore = computeAvgScore(assignments)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading hospital dashboard…</p>
  }

  if (!org || !metrics) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Hospital not found.</p>
        <Button variant="outline" asChild>
          <Link to="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              All hospitals
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/organizations/${org.id}`}>
              <Building2 className="h-4 w-4 mr-1" />
              Manage staff
            </Link>
          </Button>
        </div>
        <ExportPdfButton
          onExport={() =>
            exportOrgDashboardPdf(
              org.name,
              metrics,
              avgScore,
              staffSummaries,
              courses,
              assignments,
              trainingNeeds
            )
          }
        />
      </div>

      <PageHeader title={org.name} description="Course and training overview for this hospital" />

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Staff" value={metrics.userCount} icon={Users} />
        <StatCard
          title="Courses"
          value={`${metrics.publishedCourses}/${metrics.totalCourses}`}
          subtitle="published"
          icon={BookOpen}
        />
        <StatCard title="Completion Rate" value={`${metrics.completionRate}%`} icon={TrendingUp} />
        <StatCard title="Avg Score" value={`${avgScore}%`} icon={Award} />
        <StatCard title="Overdue" value={metrics.overdueCount} icon={AlertTriangle} />
      </div>

      <div className="grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <CompletionChart
          completed={metrics.completionRate}
          remaining={100 - metrics.completionRate}
          title="Hospital Completion"
        />
        <OrgTrainingNeedsPanel needs={trainingNeeds} orgId={org.id} />
      </div>

      <OrgStaffDirectory
        rows={staffSummaries}
        getStaffDetailPath={(userId) => `/admin/dashboard/${org.id}/staff/${userId}`}
        title="Staff training"
      />

      <OrgCourseTable orgId={org.id} courses={courses} assignments={assignments} />
    </div>
  )
}
