import { Users, TrendingUp, AlertTriangle, Award } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { CompletionChart } from '@/components/dashboard/CompletionChart'
import { ProgressTable } from '@/components/dashboard/ProgressTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAssignments } from '@/hooks/useAssignments'

export function ManagerDashboard() {
  const stats = useDashboardStats('manager')
  const { data: assignments = [] } = useAssignments()

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Team Dashboard" />
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Team Members" value={stats.totalUsers} icon={Users} />
        <StatCard title="Completion Rate" value={`${stats.completionRate}%`} icon={TrendingUp} />
        <StatCard title="In Progress" value={stats.inProgressCount} icon={Award} />
        <StatCard title="Overdue" value={stats.overdueCount} icon={AlertTriangle} />
      </div>
      <div className="grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <CompletionChart completed={stats.completionRate} remaining={100 - stats.completionRate} title="Team Completion" />
        <ProgressTable assignments={assignments} />
      </div>
    </div>
  )
}
