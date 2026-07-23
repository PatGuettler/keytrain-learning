import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
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
import { useAuthStore } from '@/store/authStore'

export function GradeHistoryCoursePage({ basePath }: { basePath: string }) {
  const { courseId } = useParams<{ courseId: string }>()
  const userId = useAuthStore((s) => s.userId)
  const profile = useAuthStore((s) => s.profile)
  const orgId = profile?.org_id

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignment-history', userId],
    queryFn: () => fetchAssignmentHistory(userId!),
    enabled: Boolean(userId),
  })

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['training-sessions', userId],
    queryFn: () => fetchSessions(userId!),
    enabled: Boolean(userId),
  })

  const { data: moduleAttempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['user-module-attempts', userId],
    queryFn: () => fetchUserModuleAttempts(userId!),
    enabled: Boolean(userId),
  })

  const assignmentForCourse = assignments.find((a) => a.course_id === courseId)

  const { data: publications = [] } = useQuery({
    queryKey: ['publications', orgId],
    queryFn: () => fetchPublicationsForOrg(orgId!),
    enabled: Boolean(orgId),
  })

  const catalogAvailability = useMemo(() => {
    if (!courseId) return 'closed' as const
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
    if (!profile) return null
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
    const rows = buildStaffTrainingRows(assignments, [profile], undefined, unlockMeta)
    return rows.find((r) => r.courseId === courseId) ?? null
  }, [assignments, profile, courseId, assignmentForCourse, unlockRequests])

  const isLoading = assignmentsLoading || sessionsLoading || attemptsLoading

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading course report…</p>
  }

  if (!profile || !courseRow) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`${basePath}/history`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Grade history
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Course not found in your training history.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`${basePath}/history`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Grade history
          </Link>
        </Button>
        <ExportPdfButton
          allowNonAdmin
          label="Download report (PDF)"
          onExport={() => exportStaffCoursePdf(profile, courseRow, sessions, moduleAttempts)}
        />
      </div>

      <div className="space-y-2">
        <PageHeader
          title={courseRow.courseTitle}
          description="Your scores, attempts, and module results for this course."
        />
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
        userId={userId!}
        readOnly
      />
    </div>
  )
}
