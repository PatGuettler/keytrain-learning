import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STATUS_LABELS } from '@/lib/constants'
import type { StaffTrainingRow } from '@/lib/dashboard-stats'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
}

export function OrgStaffTrainingTable({
  rows,
  orgId,
}: {
  rows: StaffTrainingRow[]
  orgId: string
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff training</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No assignments yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Staff training</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="lg:hidden space-y-3">
          {rows.map((row) => (
            <li key={row.assignmentId} className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <p className="font-medium text-sm">{row.userName}</p>
                <Badge variant={statusVariant[row.status]}>{STATUS_LABELS[row.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{row.courseTitle}</p>
              <p className="text-xs text-muted-foreground">
                Score {row.score != null ? `${row.score}%` : '—'} · Attempts {row.attemptsUsed}/
                {row.maxAttempts}
                {row.locked ? ' · Locked' : ''}
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/admin/dashboard/${orgId}/staff/${row.userId}`}>View details</Link>
              </Button>
            </li>
          ))}
        </ul>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Staff</th>
                <th className="pb-2 pr-4">Course</th>
                <th className="pb-2 pr-4">Score</th>
                <th className="pb-2 pr-4">Attempts</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.assignmentId} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{row.userName}</p>
                    {row.userEmail && (
                      <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4">{row.courseTitle}</td>
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
                  <td className="py-3 pr-4">
                    <Badge variant={statusVariant[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                  </td>
                  <td className="py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/dashboard/${orgId}/staff/${row.userId}`}>Details</Link>
                    </Button>
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
