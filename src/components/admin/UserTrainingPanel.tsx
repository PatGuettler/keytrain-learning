import { useMemo } from 'react'
import { Award, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchAssignments } from '@/services/assignments.service'
import { StatCard } from '@/components/dashboard/StatCard'
import { StaffCourseDirectory } from '@/components/dashboard/StaffCourseDirectory'
import { Badge } from '@/components/ui/badge'
import {
  buildStaffSummaryRows,
  buildStaffTrainingRows,
  staffOverallStatus,
} from '@/lib/dashboard-stats'
import type { Profile } from '@/types/user.types'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> =
  {
    completed: 'success',
    in_progress: 'default',
    pending: 'secondary',
    overdue: 'destructive',
    none: 'secondary',
  }

const statusLabel: Record<string, string> = {
  completed: 'All complete',
  in_progress: 'In progress',
  pending: 'Not started',
  overdue: 'Overdue',
  none: 'No courses',
}

type Props = {
  user: Profile
  getCourseDetailPath?: (courseId: string) => string
}

export function UserTrainingPanel({ user, getCourseDetailPath }: Props) {
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', user.id],
    queryFn: () => fetchAssignments(user.id),
  })

  const trainingRows = useMemo(
    () => buildStaffTrainingRows(assignments, [user]),
    [assignments, user]
  )

  const summary = useMemo(
    () => buildStaffSummaryRows([user], assignments)[0] ?? null,
    [user, assignments]
  )

  const overall = summary ? staffOverallStatus(summary) : 'none'

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading training…</p>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {summary ? (
          <Badge variant={statusVariant[overall]}>{statusLabel[overall]}</Badge>
        ) : (
          <Badge variant="secondary">No courses assigned</Badge>
        )}
      </div>

      {summary ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Courses complete"
            value={`${summary.completedCourses}/${summary.totalCourses}`}
            icon={BookOpen}
          />
          <StatCard title="Completion rate" value={`${summary.completionRate}%`} icon={TrendingUp} />
          <StatCard
            title="Avg score"
            value={summary.avgScore != null ? `${summary.avgScore}%` : '—'}
            icon={Award}
          />
          <StatCard title="Overdue" value={summary.overdueCourses} icon={AlertTriangle} />
        </div>
      ) : null}

      <StaffCourseDirectory rows={trainingRows} getCourseDetailPath={getCourseDetailPath} />
    </div>
  )
}
