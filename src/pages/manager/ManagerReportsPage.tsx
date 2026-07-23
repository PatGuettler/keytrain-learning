import { Link } from 'react-router-dom'
import { Award, BookOpen, TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { CompletionChart } from '@/components/dashboard/CompletionChart'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { OrgCourseTable } from '@/components/dashboard/OrgCourseTable'
import { OrgStaffDirectory } from '@/components/dashboard/OrgStaffDirectory'
import { StatCard } from '@/components/dashboard/StatCard'
import { exportMonthlyScoresPdf, exportOrgDashboardPdf } from '@/lib/pdf/dashboard-reports'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useManagerTrainingReports } from '@/hooks/useManagerTrainingReports'
import { computeOrgMetrics } from '@/lib/dashboard-stats'

/** Manager training reports: team roster + every course ever assigned. */
export function ManagerReportsPage() {
  const {
    organization,
    team,
    courses,
    assignments,
    staffSummaries,
    avgScore,
    metrics,
    isLoading,
  } = useManagerTrainingReports()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading training reports…</p>
  }

  const orgName = organization?.name ?? 'My team'
  const dashboardMetrics = computeOrgMetrics(
    organization?.id ?? '',
    team,
    courses,
    assignments
  )

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/manager/team">My Team</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <ExportPdfButton
            allowNonAdmin
            label="Monthly compliance (PDF)"
            onExport={() =>
              exportMonthlyScoresPdf(orgName, courses, assignments, team)
            }
          />
          <ExportPdfButton
            allowNonAdmin
            label="Team report (PDF)"
            onExport={() =>
              exportOrgDashboardPdf(
                orgName,
                dashboardMetrics,
                avgScore,
                staffSummaries,
                courses,
                assignments,
                []
              )
            }
          />
        </div>
      </div>

      <PageHeader
        title="Training reports"
        description="Every course assigned to your team. Open a course to see all employee grades."
      />

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Team members" value={metrics.teamCount} icon={Users} />
        <StatCard title="Courses assigned" value={metrics.courseCount} icon={BookOpen} />
        <StatCard title="Completion rate" value={`${metrics.completionRate}%`} icon={TrendingUp} />
        <StatCard title="Avg score" value={`${avgScore}%`} icon={Award} />
        <StatCard title="Overdue" value={metrics.overdueCount} icon={AlertTriangle} />
      </div>

      <CompletionChart
        completed={metrics.completionRate}
        remaining={100 - metrics.completionRate}
        title="Team completion"
      />

      <OrgStaffDirectory
        rows={staffSummaries}
        getStaffDetailPath={(userId) => `/manager/reports/staff/${userId}`}
        title="Team training summary"
      />

      <OrgCourseTable
        orgSlug="team"
        orgId={organization?.id}
        courses={courses}
        assignments={assignments}
        getCourseDetailPath={(courseId) => `/manager/reports/courses/${courseId}`}
      />
    </div>
  )
}
