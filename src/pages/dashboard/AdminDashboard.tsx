import { Building2, BookOpen, Users, AlertTriangle } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { CompletionChart } from '@/components/dashboard/CompletionChart'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { HospitalOverviewList } from '@/components/dashboard/HospitalOverviewList'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { PageHeader } from '@/components/layout/PageHeader'
import { exportPlatformDashboardPdf } from '@/lib/pdf/dashboard-reports'
import { formatProfileStatusSubtitle } from '@/lib/user-status'

export function AdminDashboard() {
  const { hospitals, platformTotals, isLoading } = useAdminDashboard()

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Platform Dashboard"
        description="Overview across all hospitals — select a hospital to view course details"
        action={
          <ExportPdfButton
            disabled={isLoading}
            onExport={() => exportPlatformDashboardPdf(hospitals, platformTotals)}
          />
        }
      />

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Hospitals" value={platformTotals.hospitalCount} icon={Building2} />
        <StatCard
          title="Users"
          value={platformTotals.totalUsers}
          subtitle={formatProfileStatusSubtitle(platformTotals.userStatusCounts)}
          icon={Users}
          to="/admin/dashboard/users"
        />
        <StatCard
          title="Courses"
          value={`${platformTotals.publishedCourses}/${platformTotals.totalCourses}`}
          subtitle="published"
          icon={BookOpen}
        />
        <StatCard title="Overdue" value={platformTotals.overdueCount} icon={AlertTriangle} />
      </div>

      <CompletionChart
        completed={platformTotals.completionRate}
        remaining={100 - platformTotals.completionRate}
        title="Platform Completion"
      />

      <HospitalOverviewList hospitals={hospitals} isLoading={isLoading} />
    </div>
  )
}
