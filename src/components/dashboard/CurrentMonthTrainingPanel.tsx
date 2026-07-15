import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  currentMonthLabel,
  type MonthTrainingResponseRow,
} from '@/lib/current-month-training'

const statusLabel: Record<string, string> = {
  completed: 'Responded',
  in_progress: 'In progress',
  pending: 'Not started',
  overdue: 'Overdue',
}

type Props = {
  rows: MonthTrainingResponseRow[]
  showOrgColumn?: boolean
}

export function CurrentMonthTrainingPanel({ rows, showOrgColumn = false }: Props) {
  const notResponded = rows.filter((r) => !r.responded)
  const responded = rows.filter((r) => r.responded)
  const month = currentMonthLabel()

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          {month} training responses
        </CardTitle>
        <CardDescription>
          Who has completed this month&apos;s required training — and who still needs to respond.
          Incomplete monthly catalog courses always appear here.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="destructive">{notResponded.length} not responded</Badge>
          <Badge variant="success">{responded.length} responded</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Needs response
          </h3>
          {notResponded.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
              Everyone assigned this month has responded.
            </p>
          ) : (
            <ResponseTable rows={notResponded} showOrgColumn={showOrgColumn} showScore={false} />
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Responded (with scores)
          </h3>
          {responded.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
              No completed responses for the current month yet.
            </p>
          ) : (
            <ResponseTable rows={responded} showOrgColumn={showOrgColumn} showScore />
          )}
        </section>
      </CardContent>
    </Card>
  )
}

function ResponseTable({
  rows,
  showOrgColumn,
  showScore,
}: {
  rows: MonthTrainingResponseRow[]
  showOrgColumn: boolean
  showScore: boolean
}) {
  return (
    <>
      <ul className="md:hidden space-y-2">
        {rows.map((row) => (
          <li key={row.assignmentId} className="rounded-lg border p-3 space-y-1">
            <p className="font-medium text-sm">{row.userName}</p>
            {row.userEmail ? (
              <p className="text-xs text-muted-foreground truncate">{row.userEmail}</p>
            ) : null}
            {showOrgColumn ? (
              <p className="text-xs text-muted-foreground">{row.orgName}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">{row.courseTitle}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge
                variant={
                  row.status === 'overdue'
                    ? 'destructive'
                    : row.responded
                      ? 'success'
                      : 'secondary'
                }
              >
                {statusLabel[row.status] ?? row.status}
              </Badge>
              {showScore ? (
                <span className="text-xs font-medium tabular-nums">
                  {row.score != null ? `${row.score}%` : 'No score'}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4">Staff</th>
              {showOrgColumn ? <th className="pb-2 pr-4">Organization</th> : null}
              <th className="pb-2 pr-4">Course</th>
              <th className="pb-2 pr-4">Status</th>
              {showScore ? <th className="pb-2">Score</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.assignmentId} className="border-b last:border-0">
                <td className="py-2.5 pr-4">
                  <p className="font-medium">{row.userName}</p>
                  {row.userEmail ? (
                    <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                  ) : null}
                </td>
                {showOrgColumn ? (
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.orgName}</td>
                ) : null}
                <td className="py-2.5 pr-4">{row.courseTitle}</td>
                <td className="py-2.5 pr-4">
                  <Badge
                    variant={
                      row.status === 'overdue'
                        ? 'destructive'
                        : row.responded
                          ? 'success'
                          : 'secondary'
                    }
                  >
                    {statusLabel[row.status] ?? row.status}
                  </Badge>
                </td>
                {showScore ? (
                  <td className="py-2.5 tabular-nums font-medium">
                    {row.score != null ? `${row.score}%` : '—'}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
