import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchProfiles } from '@/services/users.service'
import { fetchAssignments } from '@/services/assignments.service'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAssignmentMutations } from '@/hooks/useAssignments'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { STATUS_LABELS } from '@/lib/constants'

const scoreHistory = [
  { date: 'Jan', score: 75 },
  { date: 'Feb', score: 82 },
  { date: 'Mar', score: 88 },
]

export function EmployeeDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const { update } = useAssignmentMutations()
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
          {assignments.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0">
              <div>
                <p className="font-medium">{a.course?.title ?? 'Course'}</p>
                <p className="text-sm text-muted-foreground">
                  Due {formatDate(a.due_date)} · {STATUS_LABELS[a.status]}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge>{a.status}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => update.mutate({ id: a.id, patch: { status: 'completed' } })}
                >
                  Mark Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => update.mutate({ id: a.id, patch: { force_retake: true, status: 'pending' } })}
                >
                  Push Retake
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scores Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreHistory}>
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
