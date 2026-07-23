import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Award, BookOpen, Building2, TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { CompletionChart } from '@/components/dashboard/CompletionChart'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { OrgCourseTable } from '@/components/dashboard/OrgCourseTable'
import { OrgStaffDirectory } from '@/components/dashboard/OrgStaffDirectory'
import { OrgTrainingNeedsPanel } from '@/components/dashboard/OrgTrainingNeedsPanel'
import { StatCard } from '@/components/dashboard/StatCard'
import { exportMonthlyScoresPdf, exportOrgDashboardPdf } from '@/lib/pdf/dashboard-reports'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useOrgDashboard } from '@/hooks/useAdminDashboard'
import { useOrgRoute } from '@/hooks/useOrgRoute'
import { adminOrgDashboardPath, adminOrganizationPath } from '@/lib/org-slugs'
import {
  buildStaffSummaryRows,
  computeAvgScore,
  computeTrainingNeeds,
  filterResolvedTrainingNeeds,
} from '@/lib/dashboard-stats'
import { activePublicationCourseIds } from '@/lib/course-publications'
import {
  fetchResolvedTrainingNeedModuleIds,
  resolveTrainingNeed,
} from '@/services/training-needs.service'
import { useAuthStore } from '@/store/authStore'

export function HospitalDashboardPage() {
  const { orgId, orgSlug } = useOrgRoute()
  const adminId = useAuthStore((s) => s.userId)
  const queryClient = useQueryClient()
  const [resolvingModuleId, setResolvingModuleId] = useState<string | null>(null)
  const { org, users, courses, assignments, publications, moduleAttempts, metrics, isLoading } = useOrgDashboard(orgId)

  const { data: resolvedModuleIds = [] } = useQuery({
    queryKey: ['resolved-training-needs', orgId],
    queryFn: () => fetchResolvedTrainingNeedModuleIds(orgId!),
    enabled: Boolean(orgId),
  })

  const staffSummaries = buildStaffSummaryRows(users, assignments)
  const trainingNeeds = useMemo(
    () =>
      filterResolvedTrainingNeeds(
        computeTrainingNeeds(moduleAttempts, courses),
        resolvedModuleIds
      ),
    [moduleAttempts, courses, resolvedModuleIds]
  )
  const avgScore = computeAvgScore(assignments)
  const activeCourseIds = activePublicationCourseIds(publications)

  const handleResolveTrainingNeed = async (moduleId: string) => {
    if (!orgId || !adminId) return
    setResolvingModuleId(moduleId)
    try {
      await resolveTrainingNeed(orgId, moduleId, adminId)
      await queryClient.invalidateQueries({ queryKey: ['resolved-training-needs', orgId] })
    } finally {
      setResolvingModuleId(null)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading organization dashboard…</p>
  }

  if (!org || !metrics) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Organization not found.</p>
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
              All organizations
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={adminOrganizationPath(orgSlug!)}>
              <Building2 className="h-4 w-4 mr-1" />
              Settings &amp; users
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPdfButton
            label="Monthly scores (PDF)"
            onExport={() =>
              exportMonthlyScoresPdf(org.name, courses, assignments, users, { activeCourseIds })
            }
          />
          <ExportPdfButton
            onExport={() =>
              exportOrgDashboardPdf(
                org.name,
                metrics,
                avgScore,
                staffSummaries,
                courses,
                assignments,
                trainingNeeds,
                { orgId, publications }
              )
            }
          />
        </div>
      </div>

      <PageHeader title={org.name} description="Course and training overview for this organization" />

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
        <OrgTrainingNeedsPanel
          needs={trainingNeeds}
          orgSlug={orgSlug!}
          onResolve={handleResolveTrainingNeed}
          resolvingModuleId={resolvingModuleId}
        />
      </div>

      <OrgStaffDirectory
        rows={staffSummaries}
        getStaffDetailPath={(userId) => adminOrgDashboardPath(orgSlug!, 'staff', userId)}
        title="Staff training"
      />

      <OrgCourseTable
        orgSlug={orgSlug!}
        orgId={orgId}
        publications={publications}
        courses={courses}
        assignments={assignments}
        courseDetailBasePath="/admin/dashboard"
      />
    </div>
  )
}
