import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { StaffTrainingRow } from '@/lib/dashboard-stats'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
}

export function StaffCourseResultsTable({ rows }: { rows: StaffTrainingRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No course assignments yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Course results</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        <ul className="sm:hidden divide-y">
          {rows.map((row) => (
            <li key={row.assignmentId} className="px-4 py-3 space-y-1">
              <div className="flex justify-between gap-2">
                <p className="font-medium text-sm">{row.courseTitle}</p>
                <Badge variant={statusVariant[row.status]}>{STATUS_LABELS[row.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Score {row.score != null ? `${row.score}%` : '—'} · Attempts {row.attemptsUsed}/
                {row.maxAttempts}
                {row.dueDate ? ` · Due ${formatDate(row.dueDate)}` : ''}
              </p>
            </li>
          ))}
        </ul>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Course</th>
                <th className="pb-2 pr-4">Due</th>
                <th className="pb-2 pr-4">Score</th>
                <th className="pb-2 pr-4">Attempts</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.assignmentId} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{row.courseTitle}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatDate(row.dueDate)}</td>
                  <td className="py-3 pr-4 tabular-nums">
                    {row.score != null ? `${row.score}%` : '—'}
                  </td>
                  <td className="py-3 pr-4 tabular-nums">
                    {row.attemptsUsed}/{row.maxAttempts}
                    {row.locked && (
                      <Badge variant="destructive" className="ml-2">
                        Locked
                      </Badge>
                    )}
                  </td>
                  <td className="py-3">
                    <Badge variant={statusVariant[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
