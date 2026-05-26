import { Users, TrendingUp, AlertTriangle, Award } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { CompletionChart } from '@/components/dashboard/CompletionChart'
import { ProgressTable } from '@/components/dashboard/ProgressTable'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAssignments } from '@/hooks/useAssignments'

export function ManagerDashboard() {
  const stats = useDashboardStats('manager')
  const { data: assignments = [] } = useAssignments()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Team Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Team Members" value={stats.totalUsers} icon={Users} />
        <StatCard title="Completion Rate" value={`${stats.completionRate}%`} icon={TrendingUp} />
        <StatCard title="In Progress" value={stats.inProgressCount} icon={Award} />
        <StatCard title="Overdue" value={stats.overdueCount} icon={AlertTriangle} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <CompletionChart completed={stats.completionRate} remaining={100 - stats.completionRate} title="Team Completion" />
        <ProgressTable assignments={assignments} />
      </div>
    </div>
  )
}
