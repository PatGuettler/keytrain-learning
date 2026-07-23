import { CourseCard } from '@/components/training/CourseCard'
import { LearnerCourseAvailabilityFilter } from '@/components/training/LearnerCourseAvailabilityFilter'
import { useCourses } from '@/hooks/useCourses'
import { useAssignments } from '@/hooks/useAssignments'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { fetchSessions } from '@/services/sessions.service'
import { fetchOrganizationById } from '@/services/organizations.service'
import { fetchAssignmentHistory } from '@/services/assignments.service'
import { fetchPublicationsForOrg } from '@/services/course-publications.service'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useMemo, useState } from 'react'
import { buildGradeHistoryRows } from '@/lib/dashboard-stats'
import { activePublicationCourseIds } from '@/lib/course-publications'
import {
  learnerAvailabilityVariant,
  effectiveProgressVariant,
  type AvailabilityFilter,
} from '@/lib/learner-course-availability'
import { formatAttemptsLabel } from '@/lib/course-attempts'
import { formatDate } from '@/lib/utils'

export function CourseListPage({ basePath }: { basePath: string }) {
  const profile = useAuthStore((s) => s.profile)
  const userId = useAuthStore((s) => s.userId)
  const orgId = profile?.org_id
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('available')

  const { data: courses = [], isLoading, isError, error } = useCourses(true)
  const { data: assignments = [] } = useAssignments()
  const { data: sessions = [] } = useQuery({
    queryKey: ['training-sessions', userId],
    queryFn: () => fetchSessions(userId!),
    enabled: Boolean(userId),
  })
  const { data: organization } = useQuery({
    queryKey: ['profile-organization', orgId],
    queryFn: () => fetchOrganizationById(orgId!),
    enabled: Boolean(orgId),
  })
  const { data: historyAssignments = [] } = useQuery({
    queryKey: ['assignment-history', userId],
    queryFn: () => fetchAssignmentHistory(userId!),
    enabled: Boolean(userId) && availabilityFilter !== 'available',
  })
  const { data: publications = [] } = useQuery({
    queryKey: ['publications', orgId],
    queryFn: () => fetchPublicationsForOrg(orgId!),
    enabled: Boolean(orgId) && availabilityFilter !== 'available',
  })

  const activeCourseIds = useMemo(
    () => activePublicationCourseIds(publications),
    [publications]
  )

  const closedRows = useMemo(() => {
    const rows = buildGradeHistoryRows(historyAssignments, activeCourseIds)
    return rows.filter((r) => r.catalogAvailability === 'closed')
  }, [historyAssignments, activeCourseIds])

  const counts = useMemo(
    () => ({
      all: courses.length + closedRows.length,
      available: courses.length,
      closed: closedRows.length,
    }),
    [courses.length, closedRows.length]
  )

  const showAvailable = availabilityFilter === 'all' || availabilityFilter === 'available'
  const showClosed = availabilityFilter === 'all' || availabilityFilter === 'closed'

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold">Required Training</h2>
          <p className="text-sm text-muted-foreground">
            Available courses are required for every staff member
            {organization?.name ? ` at ${organization.name}` : ' in your organization'}.
            Closed courses remain in grade history.
          </p>
        </div>
        <LearnerCourseAvailabilityFilter
          value={availabilityFilter}
          onChange={setAvailabilityFilter}
          counts={counts}
        />
      </div>
      {isError && (
        <p className="text-sm text-destructive">
          Could not load courses{error instanceof Error ? `: ${error.message}` : '.'}
        </p>
      )}
      {showAvailable && (
        <>
          {!isError && courses.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No available courses for {organization?.name ?? 'this organization'} yet. Ask your
              administrator to publish training here.
            </p>
          )}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const assignment = assignments.find((a) => a.course_id === course.id)
              const hasCompletedAttempt = sessions.some(
                (s) => s.course_id === course.id && Boolean(s.completed_at)
              )
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  assignment={assignment}
                  playHref={`${basePath}/play/${course.id}`}
                  hasCompletedAttempt={hasCompletedAttempt}
                  catalogAvailability="available"
                />
              )
            })}
          </div>
        </>
      )}
      {showClosed && (
        <div className="space-y-3">
          {availabilityFilter === 'all' && closedRows.length > 0 && (
            <h3 className="text-sm font-semibold text-muted-foreground">Closed courses</h3>
          )}
          {closedRows.length === 0 ? (
            availabilityFilter === 'closed' && (
              <p className="text-sm text-muted-foreground">No closed courses on your record.</p>
            )
          ) : (
            <div className="grid gap-3">
              {closedRows.map((row) => (
                <Link key={row.assignmentId} to={`${basePath}/history/${row.courseId}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold truncate">{row.courseTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          Score {row.score != null ? `${row.score}%` : '—'} ·{' '}
                          {formatAttemptsLabel(row.attemptsUsed, row.maxAttempts)}
                          {row.completedAt ? ` · Completed ${formatDate(row.completedAt)}` : ''}
                        </p>
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
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
