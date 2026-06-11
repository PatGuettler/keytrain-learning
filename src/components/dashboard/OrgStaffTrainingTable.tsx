import { useNavigate } from 'react-router-dom'
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

export function StaffTrainingTable({
  rows,
  getStaffDetailPath,
  title = 'Training progress',
}: {
  rows: StaffTrainingRow[]
  getStaffDetailPath: (userId: string) => string
  title?: string
}) {
  const navigate = useNavigate()

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No assignments yet.</p>
        </CardContent>
      </Card>
    )
  }

  const openStaff = (userId: string) => navigate(getStaffDetailPath(userId))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">Click a row to view scores, attempts, and mistakes.</p>
      </CardHeader>
      <CardContent>
        <ul className="md:hidden space-y-3">
          {rows.map((row) => (
            <li key={row.assignmentId}>
              <button
                type="button"
                className="w-full rounded-lg border p-4 space-y-2 text-left hover:bg-muted/50 transition-colors"
                onClick={() => openStaff(row.userId)}
              >
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
              </button>
            </li>
          ))}
        </ul>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Staff</th>
                <th className="pb-2 pr-4">Course</th>
                <th className="pb-2 pr-4">Due</th>
                <th className="pb-2 pr-4">Score</th>
                <th className="pb-2 pr-4">Attempts</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.assignmentId}
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => openStaff(row.userId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openStaff(row.userId)
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`View training for ${row.userName}, ${row.courseTitle}`}
                >
                  <td className="py-3 pr-4">
                    <p className="font-medium text-primary underline-offset-2 hover:underline">
                      {row.userName}
                    </p>
                    {row.userEmail && (
                      <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4">{row.courseTitle}</td>
                  <td className="py-3 pr-4">{formatDate(row.dueDate)}</td>
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

/** @deprecated Use StaffTrainingTable with getStaffDetailPath */
export function OrgStaffTrainingTable({
  rows,
  orgId,
}: {
  rows: StaffTrainingRow[]
  orgId: string
}) {
  return (
    <StaffTrainingTable
      rows={rows}
      getStaffDetailPath={(userId) => `/admin/dashboard/${orgId}/staff/${userId}`}
      title="Staff training"
    />
  )
}
