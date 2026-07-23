import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronRight, FileDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LearnerCourseAvailabilityFilter } from '@/components/training/LearnerCourseAvailabilityFilter'
import { PageHeader } from '@/components/layout/PageHeader'
import { fetchAssignmentHistory } from '@/services/assignments.service'
import { fetchPublicationsForOrg } from '@/services/course-publications.service'
import { useAuthStore } from '@/store/authStore'
import { buildGradeHistoryRows } from '@/lib/dashboard-stats'
import { formatAttemptsLabel } from '@/lib/course-attempts'
import { activePublicationCourseIds } from '@/lib/course-publications'
import {
  learnerAvailabilityVariant,
  effectiveProgressVariant,
  matchesAvailabilityFilter,
  type AvailabilityFilter,
} from '@/lib/learner-course-availability'
import { formatDate } from '@/lib/utils'

export function TrainingGradeHistoryPage({ basePath }: { basePath: string }) {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.userId)
  const orgId = useAuthStore((s) => s.profile?.org_id)
  const [query, setQuery] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all')

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignment-history', userId],
    queryFn: () => fetchAssignmentHistory(userId!),
    enabled: Boolean(userId),
  })

  const { data: publications = [] } = useQuery({
    queryKey: ['publications', orgId],
    queryFn: () => fetchPublicationsForOrg(orgId!),
    enabled: Boolean(orgId),
  })

  const activeCourseIds = useMemo(
    () => activePublicationCourseIds(publications),
    [publications]
  )

  const rows = useMemo(
    () => buildGradeHistoryRows(assignments, activeCourseIds),
    [assignments, activeCourseIds]
  )

  const counts = useMemo(
    () => ({
      all: rows.length,
      available: rows.filter((r) => r.catalogAvailability === 'available').length,
      closed: rows.filter((r) => r.catalogAvailability === 'closed').length,
    }),
    [rows]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (!matchesAvailabilityFilter(row.catalogAvailability, availabilityFilter)) return false
      if (!q) return true
      return row.courseTitle.toLowerCase().includes(q)
    })
  }, [rows, query, availabilityFilter])

  const openCourse = (courseId: string) => {
    navigate(`${basePath}/history/${courseId}`)
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Grade history"
        description="All courses you have been assigned — available, completed, expired, and closed training."
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
            <LearnerCourseAvailabilityFilter
              value={availabilityFilter}
              onChange={setAvailabilityFilter}
              counts={counts}
            />
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
                {query.trim()
                  ? `No courses match "${query.trim()}".`
                  : 'No courses match this filter.'}
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
                          <Badge
                            variant={learnerAvailabilityVariant(
                              row.catalogAvailability,
                              row.status
                            )}
                          >
                            {row.availabilityLabel}
                          </Badge>
                          <Badge variant={effectiveProgressVariant(row.effectiveProgress)}>
                            {row.progressLabel}
                          </Badge>
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
                        <th className="pb-2 pr-4">Progress</th>
                        <th className="pb-2 pr-4">Availability</th>
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
                            <Badge variant={effectiveProgressVariant(row.effectiveProgress)}>
                              {row.progressLabel}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant={learnerAvailabilityVariant(
                                row.catalogAvailability,
                                row.status
                              )}
                            >
                              {row.availabilityLabel}
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
