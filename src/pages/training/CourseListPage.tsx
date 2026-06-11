import { CourseCard } from '@/components/training/CourseCard'
import { useCourses } from '@/hooks/useCourses'
import { useAssignments } from '@/hooks/useAssignments'
import { Skeleton } from '@/components/ui/skeleton'

export function CourseListPage({ basePath }: { basePath: string }) {
  const { data: courses = [], isLoading } = useCourses(true)
  const { data: assignments = [] } = useAssignments()

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
          All published courses are required for every staff member in your organization.
        </p>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const assignment = assignments.find((a) => a.course_id === course.id)
          return (
            <CourseCard
              key={course.id}
              course={course}
              assignment={assignment}
              playHref={`${basePath}/play/${course.id}`}
            />
          )
        })}
      </div>
    </div>
  )
}
