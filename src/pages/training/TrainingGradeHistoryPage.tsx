import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronRight, FileDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { fetchAssignmentHistory } from '@/services/assignments.service'
import { useAuthStore } from '@/store/authStore'
import { buildGradeHistoryRows } from '@/lib/dashboard-stats'
import { formatAttemptsLabel } from '@/lib/course-attempts'
import { STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'success',
  overdue: 'destructive',
}

export function TrainingGradeHistoryPage({ basePath }: { basePath: string }) {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.userId)
  const [query, setQuery] = useState('')

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignment-history', userId],
    queryFn: () => fetchAssignmentHistory(userId!),
    enabled: Boolean(userId),
  })

  const rows = useMemo(() => buildGradeHistoryRows(assignments), [assignments])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => row.courseTitle.toLowerCase().includes(q))
  }, [rows, query])

  const openCourse = (courseId: string) => {
    navigate(`${basePath}/history/${courseId}`)
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Grade history"
        description="All courses you have been assigned, including published and unpublished training."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading grade history…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No training assignments yet.</p>
      ) : (
        <Card>
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="text-base">Courses & scores</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {filtered.length === rows.length
                  ? `${rows.length} course${rows.length === 1 ? '' : 's'} on record`
                  : `Showing ${filtered.length} of ${rows.length} courses`}
              </p>
            </div>
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses…"
                className="pl-9"
                aria-label="Search courses"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No courses match &ldquo;{query.trim()}&rdquo;.
              </p>
            ) : (
              <>
                <ul className="md:hidden space-y-3">
                  {filtered.map((row) => (
                    <li key={row.assignmentId}>
                      <button
                        type="button"
                        onClick={() => openCourse(row.courseId)}
                        className="w-full rounded-lg border p-4 text-left space-y-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-primary">{row.courseTitle}</p>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={row.isPublished ? 'success' : 'secondary'}>
                            {row.isPublished ? 'Published' : 'Unpublished'}
                          </Badge>
                          <Badge variant={statusVariant[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Score {row.score != null ? `${row.score}%` : '—'} ·{' '}
                          {formatAttemptsLabel(row.attemptsUsed, row.maxAttempts)}
                          {row.completedAt ? ` · Completed ${formatDate(row.completedAt)}` : ''}
                        </p>
                        <p className="text-xs text-primary flex items-center gap-1">
                          <FileDown className="h-3 w-3" />
                          View course report
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4">Course</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2 pr-4">Publication</th>
                        <th className="pb-2 pr-4">Score</th>
                        <th className="pb-2 pr-4">Attempts</th>
                        <th className="pb-2 pr-4">Completed</th>
                        <th className="pb-2 pr-4">Assigned</th>
                        <th className="pb-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => (
                        <tr
                          key={row.assignmentId}
                          onClick={() => openCourse(row.courseId)}
                          className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 pr-4 font-medium text-primary">{row.courseTitle}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={statusVariant[row.status]}>
                              {STATUS_LABELS[row.status]}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={row.isPublished ? 'success' : 'secondary'}>
                              {row.isPublished ? 'Published' : 'Unpublished'}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 tabular-nums">
                            {row.score != null ? `${row.score}%` : '—'}
                          </td>
                          <td className="py-3 pr-4 tabular-nums">
                            {formatAttemptsLabel(row.attemptsUsed, row.maxAttempts)}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {formatDate(row.completedAt)}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {formatDate(row.assignedAt)}
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
      )}
    </div>
  )
}
