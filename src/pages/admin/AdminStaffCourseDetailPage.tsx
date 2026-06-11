import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { fetchAssignments } from '@/services/assignments.service'
import { fetchUserModuleAttempts, fetchSessions } from '@/services/sessions.service'
import { fetchOrgMembers } from '@/services/users.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { StaffCourseDetailSections } from '@/components/dashboard/StaffCourseDetailSections'
import { buildStaffTrainingRows } from '@/lib/dashboard-stats'
import { exportStaffCoursePdf } from '@/lib/pdf/dashboard-reports'

export function AdminStaffCourseDetailPage() {
  const { orgId, userId, courseId } = useParams<{
    orgId: string
    userId: string
    courseId: string
  }>()

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
    queryKey: ['user-module-attempts', userId],
    queryFn: () => fetchUserModuleAttempts(userId!),
    enabled: Boolean(userId),
  })

  const user = users.find((u) => u.id === userId)
  const courseRow = useMemo(() => {
    const rows = buildStaffTrainingRows(assignments, user ? [user] : [])
    return rows.find((r) => r.courseId === courseId) ?? null
  }, [assignments, user, courseId])

  if (!user) {
    return <p className="text-sm text-muted-foreground">Staff member not found.</p>
  }

  if (!courseRow) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Course not found for this staff member.</p>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/admin/dashboard/${orgId}/staff/${userId}`}>Back to staff record</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/admin/dashboard/${orgId}/staff/${userId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to {user.full_name}
          </Link>
        </Button>
        <ExportPdfButton
          onExport={() => exportStaffCoursePdf(user, courseRow, sessions, moduleAttempts)}
        />
      </div>

      <PageHeader
        title={courseRow.courseTitle}
        description={`${user.full_name} · ${user.email ?? 'Staff training'}`}
      />

      <StaffCourseDetailSections
        courseRow={courseRow}
        sessions={sessions}
        moduleAttempts={moduleAttempts}
      />
    </div>
  )
}
