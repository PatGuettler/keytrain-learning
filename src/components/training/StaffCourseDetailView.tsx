import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { fetchAssignmentHistory } from '@/services/assignments.service'
import { fetchPublicationsForOrg } from '@/services/course-publications.service'
import { fetchUserModuleAttempts, fetchSessions } from '@/services/sessions.service'
import { fetchUnlockRequestsForAssignment } from '@/services/unlock-requests.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { StaffCourseDetailSections } from '@/components/dashboard/StaffCourseDetailSections'
import { buildStaffTrainingRows } from '@/lib/dashboard-stats'
import { activePublicationCourseIds } from '@/lib/course-publications'
import {
  learnerAvailabilityLabel,
  learnerAvailabilityVariant,
  resolveCatalogAvailability,
} from '@/lib/learner-course-availability'
import { exportStaffCoursePdf } from '@/lib/pdf/dashboard-reports'
import type { Profile } from '@/types/user.types'

export function StaffCourseDetailView({
  subject,
  courseId,
  orgId,
  backLink,
  backLabel,
  readOnly = true,
  description,
}: {
  subject: Profile
  courseId: string
  orgId?: string | null
  backLink: string
  backLabel: string
  readOnly?: boolean
  description?: string
}) {
  const userId = subject.id

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignment-history', userId],
    queryFn: () => fetchAssignmentHistory(userId),
    enabled: Boolean(userId),
  })

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['training-sessions', userId],
    queryFn: () => fetchSessions(userId),
    enabled: Boolean(userId),
  })

  const { data: moduleAttempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['user-module-attempts', userId],
    queryFn: () => fetchUserModuleAttempts(userId),
    enabled: Boolean(userId),
  })

  const assignmentForCourse = assignments.find((a) => a.course_id === courseId)

  const { data: publications = [] } = useQuery({
    queryKey: ['publications', orgId],
    queryFn: () => fetchPublicationsForOrg(orgId!),
    enabled: Boolean(orgId),
  })

  const catalogAvailability = useMemo(() => {
    const activeCourseIds = activePublicationCourseIds(publications)
    return resolveCatalogAvailability(courseId, activeCourseIds)
  }, [courseId, publications])

  const availabilityLabel = useMemo(() => {
    if (!assignmentForCourse) return 'Closed'
    return learnerAvailabilityLabel(catalogAvailability, assignmentForCourse.status)
  }, [assignmentForCourse, catalogAvailability])

  const { data: unlockRequests = [] } = useQuery({
    queryKey: ['unlock-requests-assignment', assignmentForCourse?.id],
    queryFn: () => fetchUnlockRequestsForAssignment(assignmentForCourse!.id),
    enabled: Boolean(assignmentForCourse?.id),
  })

  const courseRow = useMemo(() => {
    const unlockMeta = assignmentForCourse
      ? new Map([
          [
            assignmentForCourse.id,
            {
              count: unlockRequests.length,
              pending: unlockRequests.some((r) => r.status === 'pending'),
            },
          ],
        ])
      : undefined
    const rows = buildStaffTrainingRows(assignments, [subject], undefined, unlockMeta)
    return rows.find((r) => r.courseId === courseId) ?? null
  }, [assignments, subject, courseId, assignmentForCourse, unlockRequests])

  const isLoading = assignmentsLoading || sessionsLoading || attemptsLoading

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading course report…</p>
  }

  if (!courseRow) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={backLink}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Course not found in training history.</p>
      </div>
    )
  }

  const pageDescription =
    description ??
    (subject.id === userId
      ? 'Your scores, attempts, and module results for this course.'
      : `${subject.full_name} · ${subject.email ?? 'Team member'} — scores, attempts, and module results.`)

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={backLink}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Link>
        </Button>
        <ExportPdfButton
          allowNonAdmin
          label="Download report (PDF)"
          onExport={() => exportStaffCoursePdf(subject, courseRow, sessions, moduleAttempts)}
        />
      </div>

      <div className="space-y-2">
        <PageHeader title={courseRow.courseTitle} description={pageDescription} />
        <Badge
          variant={learnerAvailabilityVariant(
            catalogAvailability,
            assignmentForCourse?.status ?? 'pending'
          )}
        >
          {availabilityLabel}
        </Badge>
      </div>

      <StaffCourseDetailSections
        courseRow={courseRow}
        sessions={sessions}
        moduleAttempts={moduleAttempts}
        unlockRequests={unlockRequests}
        userId={userId}
        readOnly={readOnly}
        catalogAvailability={catalogAvailability}
      />
    </div>
  )
}
