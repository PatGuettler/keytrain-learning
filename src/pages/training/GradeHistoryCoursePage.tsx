import { useParams } from 'react-router-dom'
import { StaffCourseDetailView } from '@/components/training/StaffCourseDetailView'
import { useAuthStore } from '@/store/authStore'

export function GradeHistoryCoursePage({ basePath }: { basePath: string }) {
  const { courseId } = useParams<{ courseId: string }>()
  const profile = useAuthStore((s) => s.profile)
  const orgId = profile?.org_id

  if (!profile || !courseId) {
    return (
      <p className="text-sm text-muted-foreground">Course not found in your training history.</p>
    )
  }

  return (
    <StaffCourseDetailView
      subject={profile}
      courseId={courseId}
      orgId={orgId}
      backLink={`${basePath}/history`}
      backLabel="Grade history"
      readOnly
    />
  )
}
