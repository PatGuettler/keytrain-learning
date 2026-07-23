import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/authStore'
import { GradeHistoryPanel } from '@/components/training/GradeHistoryPanel'

export function TrainingGradeHistoryPage({ basePath }: { basePath: string }) {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.userId)
  const orgId = useAuthStore((s) => s.profile?.org_id)

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Grade history"
        description="All courses you have been assigned — available, completed, expired, and closed training."
      />
      {userId && (
        <GradeHistoryPanel
          userId={userId}
          orgId={orgId}
          onCourseClick={(courseId) => navigate(`${basePath}/history/${courseId}`)}
        />
      )}
    </div>
  )
}
