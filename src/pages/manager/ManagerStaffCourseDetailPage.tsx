import { Link, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { StaffCourseDetailView } from '@/components/training/StaffCourseDetailView'
import { Button } from '@/components/ui/button'
import { fetchProfiles } from '@/services/users.service'
import { useAuthStore } from '@/store/authStore'

/** Manager view of one employee's history on a single course (same detail as employee grade history). */
export function ManagerStaffCourseDetailPage() {
  const { userId: employeeId, courseId } = useParams<{ userId: string; courseId: string }>()
  const location = useLocation()
  const managerId = useAuthStore((s) => s.userId)
  const orgId = useAuthStore((s) => s.profile?.org_id)

  const { data: team = [] } = useQuery({
    queryKey: ['team', managerId],
    queryFn: () => fetchProfiles({ managerId: managerId! }),
    enabled: Boolean(managerId),
  })

  const employee = team.find((p) => p.id === employeeId && p.role === 'employee')

  const fromCourseReport = location.pathname.includes('/reports/courses/')
  const backLink = fromCourseReport
    ? `/manager/reports/courses/${courseId}`
    : `/manager/reports/staff/${employeeId}`
  const backLabel = fromCourseReport ? 'Course report' : employee?.full_name ?? 'Employee report'

  if (!employee || !courseId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/manager/reports">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Training reports
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Employee or course not found on your team.</p>
      </div>
    )
  }

  return (
    <StaffCourseDetailView
      subject={employee}
      courseId={courseId}
      orgId={orgId}
      backLink={backLink}
      backLabel={backLabel}
      readOnly
    />
  )
}
