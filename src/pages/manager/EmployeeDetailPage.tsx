import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchProfiles } from '@/services/users.service'
import { fetchAssignments } from '@/services/assignments.service'
import { fetchSessions } from '@/services/sessions.service'
import { formatDate } from '@/lib/utils'
import { buildScoreHistory, resolveAssignmentScore } from '@/lib/dashboard-stats'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { STATUS_LABELS } from '@/lib/constants'

export function EmployeeDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => fetchProfiles(),
  })
  const employee = profiles.find((p) => p.id === employeeId)
  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', employeeId],
    queryFn: () => fetchAssignments(employeeId),
    enabled: Boolean(employeeId),
  })
  const { data: sessions = [] } = useQuery({
    queryKey: ['training-sessions', employeeId],
    queryFn: () => fetchSessions(employeeId),
    enabled: Boolean(employeeId),
  })

  const scoreHistory = buildScoreHistory(sessions)

  if (!employee) return <p>Employee not found</p>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{employee.full_name}</h2>
        <p className="text-muted-foreground">Joined {formatDate(employee.created_at)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Training Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No required courses assigned yet.</p>
          ) : (
            assignments.map((a) => {
              const score = resolveAssignmentScore(a)
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">{a.course?.title ?? 'Course'}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.due_date ? `Take by ${formatDate(a.due_date)}` : 'Required'} ·{' '}
                      {STATUS_LABELS[a.status]}
                      {score != null && ` · Score ${score}%`}
                    </p>
                  </div>
                  <Badge
                    variant={a.status === 'completed' ? 'success' : 'secondary'}
                    className="w-fit capitalize"
                  >
                    {STATUS_LABELS[a.status]}
                  </Badge>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scores Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-48">
          {scoreHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No completed courses yet.</p>
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
  )
}
