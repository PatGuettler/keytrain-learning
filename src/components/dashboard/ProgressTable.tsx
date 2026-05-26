import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/constants'
import type { Assignment } from '@/types/course.types'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
}

export function ProgressTable({ assignments }: { assignments: Assignment[] }) {
  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No assignments yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Training Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile: card list */}
        <ul className="md:hidden space-y-3">
          {assignments.map((a) => (
            <li key={a.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-snug">{a.course?.title ?? a.course_id}</p>
                <Badge variant={statusVariant[a.status]} className="shrink-0">
                  {STATUS_LABELS[a.status]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Due {formatDate(a.due_date)}</p>
            </li>
          ))}
        </ul>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Course</th>
                <th className="pb-2 pr-4">Due</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{a.course?.title ?? a.course_id}</td>
                  <td className="py-3 pr-4">{formatDate(a.due_date)}</td>
                  <td className="py-3">
                    <Badge variant={statusVariant[a.status]}>{STATUS_LABELS[a.status]}</Badge>
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
