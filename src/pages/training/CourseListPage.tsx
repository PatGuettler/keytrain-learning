import { CourseCard } from '@/components/training/CourseCard'
import { useCourses } from '@/hooks/useCourses'
import { useAssignments } from '@/hooks/useAssignments'
import { useQuery } from '@tanstack/react-query'
import { fetchSessions } from '@/services/sessions.service'
import { fetchOrganizationById } from '@/services/organizations.service'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/ui/skeleton'

export function CourseListPage({ basePath }: { basePath: string }) {
  const profile = useAuthStore((s) => s.profile)
  const { data: courses = [], isLoading, isError, error } = useCourses(true)
  const { data: assignments = [] } = useAssignments()
  const userId = useAuthStore((s) => s.userId)
  const { data: sessions = [] } = useQuery({
    queryKey: ['training-sessions', userId],
    queryFn: () => fetchSessions(userId!),
    enabled: Boolean(userId),
  })
  const { data: organization } = useQuery({
    queryKey: ['profile-organization', profile?.org_id],
    queryFn: () => fetchOrganizationById(profile!.org_id),
    enabled: Boolean(profile?.org_id),
  })

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
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold">Required Training</h2>
        <p className="text-sm text-muted-foreground">
          All published courses are required for every staff member
          {organization?.name ? ` at ${organization.name}` : ' in your organization'}.
        </p>
      </div>
      {isError && (
        <p className="text-sm text-destructive">
          Could not load courses{error instanceof Error ? `: ${error.message}` : '.'}
        </p>
      )}
      {!isError && courses.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No published courses for {organization?.name ?? 'this organization'} yet. Ask your
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
            />
          )
        })}
      </div>
    </div>
  )
}
