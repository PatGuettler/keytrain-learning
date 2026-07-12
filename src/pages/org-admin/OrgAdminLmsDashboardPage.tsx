import { Link } from 'react-router-dom'
import { Award, BookOpen, TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
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
import { useAuthStore } from '@/store/authStore'
import { fetchOrganizationById } from '@/services/organizations.service'
import { getOrgSlug } from '@/lib/org-slugs'

/** LMS training reports for the signed-in org admin's organization. */
export function OrgAdminLmsDashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const orgId = profile?.org_id

  const { data: orgMeta } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => fetchOrganizationById(orgId!),
    enabled: Boolean(orgId),
  })

  const { org, users, courses, assignments, moduleAttempts, metrics, isLoading } = useOrgDashboard(
    orgId
  )

  const displayOrg = org ?? orgMeta
  const orgSlug = displayOrg ? getOrgSlug(displayOrg, [displayOrg]) : 'org'
  const staffSummaries = buildStaffSummaryRows(users, assignments)
  const trainingNeeds = computeTrainingNeeds(moduleAttempts, courses)
  const avgScore = computeAvgScore(assignments)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading organization dashboard…</p>
  }

  if (!displayOrg || !metrics) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Organization training data is not available yet.</p>
        <Button variant="outline" asChild>
          <Link to="/org-admin/dashboard">Back</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/org-admin/users">Manage users</Link>
        </Button>
        <ExportPdfButton
          allowNonAdmin
          onExport={() =>
            exportOrgDashboardPdf(
              displayOrg.name,
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

      <PageHeader
        title={`${displayOrg.name} — Training`}
        description="Completion rates, staff progress, and training needs for your organization."
      />

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
          title="Organization completion"
        />
        <OrgTrainingNeedsPanel needs={trainingNeeds} orgSlug={orgSlug} />
      </div>

      <OrgStaffDirectory
        rows={staffSummaries}
        getStaffDetailPath={() => '/org-admin/users'}
        title="Staff training"
      />

      <OrgCourseTable orgSlug={orgSlug} courses={courses} assignments={assignments} />
    </div>
  )
}
