import { GraduationCap, Clock, Award } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { ProgressTable } from '@/components/dashboard/ProgressTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAssignments } from '@/hooks/useAssignments'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function EmployeeDashboard() {
  const stats = useDashboardStats('employee')
  const { data: assignments = [] } = useAssignments()
  const completedCount = assignments.filter((a) => a.status === 'completed').length

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="My Dashboard"
        action={
          <Button asChild className="w-full sm:w-auto min-h-11">
            <Link to="/employee/training">Continue Training</Link>
          </Button>
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
