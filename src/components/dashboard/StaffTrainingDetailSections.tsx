import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STATUS_LABELS } from '@/lib/constants'
import {
  buildScoreHistory,
  extractModuleIssues,
  type StaffTrainingRow,
} from '@/lib/dashboard-stats'
import { formatDate } from '@/lib/utils'
import type { ModuleAttempt, TrainingSession } from '@/types/course.types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function courseTitleForSession(session: TrainingSession, rows: StaffTrainingRow[]): string {
  return rows.find((r) => r.courseId === session.course_id)?.courseTitle ?? 'Course'
}

export function StaffTrainingDetailSections({
  trainingRows,
  sessions,
  moduleAttempts,
}: {
  trainingRows: StaffTrainingRow[]
  sessions: TrainingSession[]
  moduleAttempts: ModuleAttempt[]
}) {
  const scoreHistory = buildScoreHistory(sessions)
  const completedSessions = sessions
    .filter((s) => s.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trainingRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No course assignments.</p>
            ) : (
              trainingRows.map((row) => (
                <div
                  key={row.assignmentId}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{row.courseTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Score {row.score != null ? `${row.score}%` : '—'} · Attempts {row.attemptsUsed}/
                      {row.maxAttempts}
                      {row.locked ? ' · Locked' : ''}
                    </p>
                  </div>
                  <Badge variant={row.status === 'completed' ? 'success' : 'secondary'}>
                    {STATUS_LABELS[row.status]}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scores over time</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            {scoreHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No completed sessions yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreHistory}>
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course attempt history</CardTitle>
        </CardHeader>
        <CardContent>
          {completedSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed course attempts yet.</p>
          ) : (
            <ul className="space-y-2">
              {completedSessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {courseTitleForSession(session, trainingRows)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(session.completed_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.score != null && (
                      <span className="text-sm font-medium tabular-nums">{Math.round(Number(session.score))}%</span>
                    )}
                    <Badge variant={session.passed ? 'success' : 'warning'}>
                      {session.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Module attempts & mistakes</CardTitle>
        </CardHeader>
        <CardContent>
          {moduleAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No module attempts recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {moduleAttempts.map((attempt) => {
                const issues = extractModuleIssues(attempt)
                const passed =
                  attempt.interactions?.passed === true ||
                  (attempt.score != null && attempt.score >= 80)
                return (
                  <li key={attempt.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{attempt.module?.title ?? 'Module'}</p>
                        <p className="text-xs text-muted-foreground">
                          {attempt.module?.type ?? 'module'} ·{' '}
                          {attempt.completed_at ? formatDate(attempt.completed_at) : '—'}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        {attempt.score != null && (
                          <span className="text-sm font-medium tabular-nums">{attempt.score}%</span>
                        )}
                        <Badge variant={passed ? 'success' : 'warning'}>
                          {passed ? 'Passed' : 'Needs review'}
                        </Badge>
                      </div>
                    </div>
                    {issues.length > 0 && (
                      <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                        {issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
