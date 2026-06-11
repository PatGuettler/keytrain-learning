import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { fetchAssignments } from '@/services/assignments.service'
import { fetchOrgModuleAttempts, fetchSessions } from '@/services/sessions.service'
import { fetchOrgMembers } from '@/services/users.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  buildScoreHistory,
  buildStaffTrainingRows,
} from '@/lib/dashboard-stats'
import { STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function formatModuleIssues(interactions: Record<string, unknown> | null): string[] {
  if (!interactions) return []
  const issues: string[] = []
  if (Array.isArray(interactions.wrong_questions)) {
    for (const q of interactions.wrong_questions as { text?: string }[]) {
      if (q.text) issues.push(q.text)
    }
  }
  if (Array.isArray(interactions.wrong_ids)) {
    issues.push(`${(interactions.wrong_ids as string[]).length} sorting mistake(s)`)
  }
  if (interactions.results && typeof interactions.results === 'object') {
    const wrong = Object.values(interactions.results as Record<string, string>).filter(
      (v) => v === 'wrong'
    ).length
    if (wrong > 0) issues.push(`${wrong} hotspot mistake(s)`)
  }
  if (issues.length === 0 && interactions.passed === false) {
    issues.push('Did not pass module')
  }
  return issues
}

export function AdminStaffTrainingPage() {
  const { orgId, userId } = useParams<{ orgId: string; userId: string }>()

  const { data: users = [] } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: () => fetchOrgMembers(orgId!, true),
    enabled: Boolean(orgId),
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', userId],
    queryFn: () => fetchAssignments(userId),
    enabled: Boolean(userId),
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['training-sessions', userId],
    queryFn: () => fetchSessions(userId),
    enabled: Boolean(userId),
  })

  const { data: moduleAttempts = [] } = useQuery({
    queryKey: ['org-module-attempts', orgId],
    queryFn: () => fetchOrgModuleAttempts(orgId!),
    enabled: Boolean(orgId),
  })

  const user = users.find((u) => u.id === userId)
  const userAssignments = useMemo(
    () => buildStaffTrainingRows(assignments.filter((a) => a.user_id === userId)),
    [assignments, userId]
  )
  const userAttempts = useMemo(
    () => moduleAttempts.filter((a) => a.user_id === userId),
    [moduleAttempts, userId]
  )
  const scoreHistory = buildScoreHistory(sessions)

  if (!user) {
    return <p className="text-sm text-muted-foreground">Staff member not found.</p>
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/admin/dashboard/${orgId}`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to hospital dashboard
        </Link>
      </Button>

      <PageHeader
        title={user.full_name}
        description={user.email ?? 'Staff training record'}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {userAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No course assignments.</p>
            ) : (
              userAssignments.map((row) => (
                <div
                  key={row.assignmentId}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{row.courseTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Score {row.score != null ? `${row.score}%` : '—'} · Attempts {row.attemptsUsed}/
                      {row.maxAttempts}
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
          <CardTitle className="text-base">Module attempts & mistakes</CardTitle>
        </CardHeader>
        <CardContent>
          {userAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No module attempts recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {userAttempts.map((attempt) => {
                const issues = formatModuleIssues(attempt.interactions)
                const passed =
                  attempt.interactions?.passed === true ||
                  (attempt.score != null && attempt.score >= 80)
                return (
                  <li key={attempt.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">
                          {attempt.module?.title ?? 'Module'}
                        </p>
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
    </div>
  )
}
