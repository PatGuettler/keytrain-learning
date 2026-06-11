import { useQuery } from '@tanstack/react-query'
import { Users, TrendingUp, AlertTriangle, Award } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { CompletionChart } from '@/components/dashboard/CompletionChart'
import { StaffTrainingTable } from '@/components/dashboard/OrgStaffTrainingTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAuthStore } from '@/store/authStore'
import { fetchAssignmentsForManager } from '@/services/assignments.service'
import { fetchProfiles } from '@/services/users.service'
import { buildStaffTrainingRows } from '@/lib/dashboard-stats'

export function ManagerDashboard() {
  const stats = useDashboardStats('manager')
  const managerId = useAuthStore((s) => s.userId)
  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', 'manager', managerId],
    queryFn: () => fetchAssignmentsForManager(managerId!),
    enabled: Boolean(managerId),
  })
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['profiles', 'manager', managerId],
    queryFn: () => fetchProfiles({ managerId: managerId! }),
    enabled: Boolean(managerId),
  })

  const staffRows = buildStaffTrainingRows(assignments, teamMembers)

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Team Dashboard" />
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Team Members" value={stats.totalUsers} icon={Users} />
        <StatCard title="Completion Rate" value={`${stats.completionRate}%`} icon={TrendingUp} />
        <StatCard title="In Progress" value={stats.inProgressCount} icon={Award} />
        <StatCard title="Overdue" value={stats.overdueCount} icon={AlertTriangle} />
      </div>
      <CompletionChart
        completed={stats.completionRate}
        remaining={100 - stats.completionRate}
        title="Team Completion"
      />
      <StaffTrainingTable
        rows={staffRows}
        getStaffDetailPath={(userId) => `/manager/team/${userId}`}
      />
    </div>
  )
}
