import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { fetchAssignmentHistory } from '@/services/assignments.service'
import { useAuthStore } from '@/store/authStore'
import { buildGradeHistoryRows } from '@/lib/dashboard-stats'
import { formatAttemptsLabel } from '@/lib/course-attempts'
import { STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
}

export function TrainingGradeHistoryPage() {
  const userId = useAuthStore((s) => s.userId)

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignment-history', userId],
    queryFn: () => fetchAssignmentHistory(userId!),
    enabled: Boolean(userId),
  })

  const rows = useMemo(() => buildGradeHistoryRows(assignments), [assignments])

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Grade history"
        description="All courses you have been assigned, including published and unpublished training."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading grade history…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No training assignments yet.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Courses & scores</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {rows.length} course{rows.length === 1 ? '' : 's'} on record
            </p>
          </CardHeader>
          <CardContent>
            <ul className="md:hidden space-y-3">
              {rows.map((row) => (
                <li key={row.assignmentId} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{row.courseTitle}</p>
                    <Badge variant={row.isPublished ? 'success' : 'secondary'}>
                      {row.isPublished ? 'Published' : 'Unpublished'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Score {row.score != null ? `${row.score}%` : '—'} ·{' '}
                    {formatAttemptsLabel(row.attemptsUsed, row.maxAttempts)}
                    {row.completedAt ? ` · Completed ${formatDate(row.completedAt)}` : ''}
                  </p>
                  <Badge variant={statusVariant[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                </li>
              ))}
            </ul>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Course</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Publication</th>
                    <th className="pb-2 pr-4">Score</th>
                    <th className="pb-2 pr-4">Attempts</th>
                    <th className="pb-2 pr-4">Completed</th>
                    <th className="pb-2 pr-4">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.assignmentId} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{row.courseTitle}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusVariant[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={row.isPublished ? 'success' : 'secondary'}>
                          {row.isPublished ? 'Published' : 'Unpublished'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {row.score != null ? `${row.score}%` : '—'}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">
                        {formatAttemptsLabel(row.attemptsUsed, row.maxAttempts)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(row.completedAt)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(row.assignedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
