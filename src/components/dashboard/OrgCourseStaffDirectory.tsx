import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { StaffTrainingRow } from '@/lib/dashboard-stats'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
}

export function OrgCourseStaffDirectory({
  rows,
  getStaffCoursePath,
}: {
  rows: StaffTrainingRow[]
  getStaffCoursePath: (userId: string) => string
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (row) =>
        row.userName.toLowerCase().includes(q) ||
        (row.userEmail?.toLowerCase().includes(q) ?? false)
    )
  }, [rows, query])

  const openStaffCourse = (userId: string) => navigate(getStaffCoursePath(userId))

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="text-base">Staff on this course</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Search by name or email, then open a staff member for scores, attempts, and module mistakes.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff…"
            className="pl-9"
            aria-label="Search staff"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {rows.length === 0 ? (
          <p className="px-4 pb-4 sm:px-0 text-sm text-muted-foreground">No staff assigned yet.</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 pb-4 sm:px-0 text-sm text-muted-foreground">
            No staff match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <>
            <ul className="sm:hidden divide-y">
              {filtered.map((row) => (
                <li key={row.assignmentId}>
                  <button
                    type="button"
                    onClick={() => openStaffCourse(row.userId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium text-sm truncate">{row.userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.userEmail}</p>
                      <p className="text-xs text-muted-foreground">
                        Score {row.score != null ? `${row.score}%` : '—'} · Attempts {row.attemptsUsed}/
                        {row.maxAttempts}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusVariant[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Staff</th>
                    <th className="pb-2 pr-4">Due</th>
                    <th className="pb-2 pr-4">Score</th>
                    <th className="pb-2 pr-4">Attempts</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.assignmentId}
                      onClick={() => openStaffCourse(row.userId)}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium text-primary">{row.userName}</p>
                        {row.userEmail && (
                          <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{formatDate(row.dueDate)}</td>
                      <td className="py-3 pr-4 tabular-nums text-foreground">
                        {row.score != null ? `${row.score}%` : '—'}
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-foreground">
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
                      <td className="py-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
