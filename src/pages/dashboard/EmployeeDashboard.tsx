import { GraduationCap, Clock, Award } from 'lucide-react'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { StatCard } from '@/components/dashboard/StatCard'
import { ProgressTable } from '@/components/dashboard/ProgressTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { exportEmployeeDashboardPdf } from '@/lib/pdf/dashboard-reports'
import { useAuthStore } from '@/store/authStore'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAssignments } from '@/hooks/useAssignments'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function EmployeeDashboard() {
  const stats = useDashboardStats('employee')
  const userName = useAuthStore((s) => s.profile?.full_name ?? 'My')
  const { data: assignments = [] } = useAssignments()
  const completedCount = assignments.filter((a) => a.status === 'completed').length

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="My Dashboard"
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <ExportPdfButton
              onExport={() =>
                exportEmployeeDashboardPdf(userName, {
                  assigned: assignments.length,
                  completed: completedCount,
                  avgScore: stats.avgScore,
                }, assignments)
              }
            />
            <Button asChild className="w-full sm:w-auto min-h-11">
              <Link to="/employee/training">Continue Training</Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard title="Assigned" value={assignments.length} icon={GraduationCap} />
        <StatCard title="Completed" value={completedCount} icon={Clock} />
        <StatCard title="Avg Score" value={`${stats.avgScore}%`} icon={Award} />
      </div>
      <ProgressTable assignments={assignments} />
    </div>
  )
}
