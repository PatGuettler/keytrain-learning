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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Courses</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
