import { GraduationCap, Clock, Award } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { ProgressTable } from '@/components/dashboard/ProgressTable'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAssignments } from '@/hooks/useAssignments'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function EmployeeDashboard() {
  const stats = useDashboardStats('employee')
  const { data: assignments = [] } = useAssignments()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold">My Dashboard</h2>
        <Button asChild>
          <Link to="/employee/training">Continue Training</Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Assigned" value={assignments.length} icon={GraduationCap} />
        <StatCard title="In Progress" value={stats.inProgressCount} icon={Clock} />
        <StatCard title="Avg Score" value={`${stats.avgScore}%`} icon={Award} />
      </div>
      <ProgressTable assignments={assignments} />
    </div>
  )
}
