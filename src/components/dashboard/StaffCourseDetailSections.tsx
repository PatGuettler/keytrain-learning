import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STATUS_LABELS } from '@/lib/constants'
import { formatAttemptsLabel, formatMaxAttempts } from '@/lib/course-attempts'
import {
  buildScoreHistory,
  extractModuleIssues,
  type StaffTrainingRow,
} from '@/lib/dashboard-stats'
import { formatDate } from '@/lib/utils'
import type { CourseUnlockRequest, ModuleAttempt, TrainingSession } from '@/types/course.types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { chartTheme } from '@/lib/chart-theme'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
}

function groupModuleAttemptsBySession(
  attempts: ModuleAttempt[],
  sessions: TrainingSession[]
): Array<{ attemptNumber: number; sessionId: string | null; attempts: ModuleAttempt[] }> {
  const sessionById = new Map(sessions.map((s) => [s.id, s]))
  const groups = new Map<number, ModuleAttempt[]>()

  for (const attempt of attempts) {
    const session = sessionById.get(attempt.session_id)
    const attemptNumber = session?.attempt_number ?? 0
    const list = groups.get(attemptNumber) ?? []
    list.push(attempt)
    groups.set(attemptNumber, list)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([attemptNumber, moduleAttempts]) => ({
      attemptNumber,
      sessionId: moduleAttempts[0]?.session_id ?? null,
      attempts: moduleAttempts,
    }))
}

export function StaffCourseDetailSections({
  courseRow,
  sessions,
  moduleAttempts,
  unlockRequests = [],
}: {
  courseRow: StaffTrainingRow
  sessions: TrainingSession[]
  moduleAttempts: ModuleAttempt[]
  unlockRequests?: CourseUnlockRequest[]
}) {
  const courseSessions = sessions.filter((s) => s.course_id === courseRow.courseId)
  const courseModuleAttempts = moduleAttempts.filter(
    (a) => a.module?.course_id === courseRow.courseId
  )
  const scoreHistory = buildScoreHistory(courseSessions)
  const completedSessions = courseSessions
    .filter((s) => s.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
  const attemptsBySession = groupModuleAttemptsBySession(courseModuleAttempts, courseSessions)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <Badge variant={statusVariant[courseRow.status]}>{STATUS_LABELS[courseRow.status]}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Score</dt>
              <dd className="mt-1 font-medium tabular-nums text-foreground">
                {courseRow.score != null ? `${courseRow.score}%` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Attempts</dt>
              <dd className="mt-1 font-medium tabular-nums text-foreground">
                {formatAttemptsLabel(courseRow.attemptsUsed, courseRow.maxAttempts)}
                {courseRow.locked && (
                  <Badge variant="destructive" className="ml-2">
                    Locked
                  </Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Max attempts</dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatMaxAttempts(courseRow.maxAttempts)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Unlock requests</dt>
              <dd className="mt-1 font-medium text-foreground">
                {courseRow.unlockRequestCount}
                {courseRow.pendingUnlockRequest && (
                  <Badge variant="warning" className="ml-2">
                    Pending
                  </Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Due</dt>
              <dd className="mt-1 font-medium text-foreground">{formatDate(courseRow.dueDate)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {unlockRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unlock request history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {unlockRequests.map((req) => (
                <li key={req.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <span className="text-muted-foreground">{formatDate(req.requested_at)}</span>
                  <Badge
                    variant={
                      req.status === 'approved' ? 'success' : req.status === 'denied' ? 'secondary' : 'warning'
                    }
                  >
                    {req.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scores over time</CardTitle>
        </CardHeader>
        <CardContent className="h-48">
          {scoreHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No completed attempts yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreHistory}>
                <XAxis dataKey="date" stroke={chartTheme.axisStroke} tick={chartTheme.tick} />
                <YAxis domain={[0, 100]} stroke={chartTheme.axisStroke} tick={chartTheme.tick} />
                <Tooltip contentStyle={chartTheme.tooltip} />
                <Line type="monotone" dataKey="score" stroke={chartTheme.primary} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

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
                    <p className="font-medium text-sm">Attempt {session.attempt_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(session.completed_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.score != null && (
                      <span className="text-sm font-medium tabular-nums">
                        {Math.round(Number(session.score))}%
                      </span>
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
          {attemptsBySession.length === 0 ? (
            <p className="text-sm text-muted-foreground">No module attempts recorded yet.</p>
          ) : (
            <div className="space-y-6">
              {attemptsBySession.map(({ attemptNumber, attempts }) => (
                <div key={attemptNumber} className="space-y-3">
                  <h3 className="text-sm font-semibold">Course attempt {attemptNumber || '—'}</h3>
                  <ul className="space-y-3">
                    {attempts.map((attempt) => {
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
