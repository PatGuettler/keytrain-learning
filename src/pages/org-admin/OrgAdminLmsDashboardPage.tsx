import { Link } from 'react-router-dom'
import { Award, BookOpen, TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { CompletionChart } from '@/components/dashboard/CompletionChart'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { OrgCourseTable } from '@/components/dashboard/OrgCourseTable'
import { OrgStaffDirectory } from '@/components/dashboard/OrgStaffDirectory'
import { StatCard } from '@/components/dashboard/StatCard'
import { exportOrgDashboardPdf } from '@/lib/pdf/dashboard-reports'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useOrgAdminTrainingReports } from '@/hooks/useOrgAdminTrainingReports'
import { getOrgSlug } from '@/lib/org-slugs'

/** Multi-org LMS training reports: filter by org, then open staff for scores and progress. */
export function OrgAdminLmsDashboardPage() {
  const {
    adminOrgs,
    orgFilter,
    setOrgFilter,
    selectedOrg,
    showOrgColumn,
    courses,
    assignments,
    metrics,
    staffSummaries,
    avgScore,
    isLoading,
  } = useOrgAdminTrainingReports()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading training reports…</p>
  }

  if (adminOrgs.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No organizations available yet. Create or join an organization first.
        </p>
        <Button variant="outline" asChild>
          <Link to="/org-admin/organizations">Organizations</Link>
        </Button>
      </div>
    )
  }

  const title =
    orgFilter === 'all'
      ? 'All organizations — Training'
      : `${selectedOrg?.name ?? 'Organization'} — Training`

  const orgSlug = selectedOrg ? getOrgSlug(selectedOrg, adminOrgs) : 'org'

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/org-admin/organizations">Manage organizations</Link>
        </Button>
        <ExportPdfButton
          allowNonAdmin
          onExport={() =>
            exportOrgDashboardPdf(
              orgFilter === 'all' ? 'All managed organizations' : (selectedOrg?.name ?? 'Organization'),
              metrics,
              avgScore,
              staffSummaries,
              courses,
              assignments,
              []
            )
          }
        />
      </div>

      <PageHeader
        title={title}
        description="Filter by organization, then open a staff member to see scores and course progress."
      />

      <div className="space-y-2">
        <Label htmlFor="org-training-filter">Organization</Label>
        <select
          id="org-training-filter"
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="flex h-11 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All organizations</option>
          {adminOrgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

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

      <CompletionChart
        completed={metrics.completionRate}
        remaining={100 - metrics.completionRate}
        title="Organization completion"
      />

      <OrgStaffDirectory
        rows={staffSummaries}
        getStaffDetailPath={(userId) => `/org-admin/training-reports/staff/${userId}`}
        title="Staff training"
        showOrgColumn={showOrgColumn}
      />

      <OrgCourseTable orgSlug={orgSlug} courses={courses} assignments={assignments} />
    </div>
  )
}
