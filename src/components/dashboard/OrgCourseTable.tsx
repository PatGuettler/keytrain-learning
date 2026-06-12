import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeCourseMetrics } from '@/lib/dashboard-stats'
import type { Assignment, Course } from '@/types/course.types'

export function OrgCourseTable({
  orgId,
  courses,
  assignments,
}: {
  orgId: string
  courses: Course[]
  assignments: Assignment[]
}) {
  const navigate = useNavigate()
  const rows = computeCourseMetrics(courses, assignments)

  const openCourse = (courseId: string) => {
    navigate(`/admin/dashboard/${orgId}/courses/${courseId}`)
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No courses for this hospital yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Courses</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Open a course to view training gaps and staff progress.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="md:hidden space-y-3">
          {rows.map(({ course, assignmentCount, completedCount, completionRate, overdueCount, avgScore }) => (
            <li key={course.id}>
              <button
                type="button"
                onClick={() => openCourse(course.id)}
                className="w-full rounded-lg border p-4 text-left space-y-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-snug text-foreground">{course.title}</p>
                  <Badge variant={course.is_published ? 'success' : 'secondary'}>
                    {course.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {course.estimated_minutes} min · {assignmentCount} assigned · {completedCount} completed
                  {avgScore != null ? ` · ${avgScore}% avg` : ''} · {completionRate}% rate
                  {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
                </p>
              </button>
            </li>
          ))}
        </ul>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Course</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Duration</th>
                <th className="pb-2 pr-4">Assigned</th>
                <th className="pb-2 pr-4">Completed</th>
                <th className="pb-2 pr-4">Avg score</th>
                <th className="pb-2 pr-4">Rate</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ course, assignmentCount, completedCount, completionRate, overdueCount, avgScore }) => (
                <tr
                  key={course.id}
                  onClick={() => openCourse(course.id)}
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-primary">{course.title}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={course.is_published ? 'success' : 'secondary'}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-foreground">{course.estimated_minutes} min</td>
                  <td className="py-3 pr-4 text-foreground">{assignmentCount}</td>
                  <td className="py-3 pr-4 text-foreground">
                    {completedCount}
                    {overdueCount > 0 && (
                      <span className="text-destructive ml-1">({overdueCount} overdue)</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-foreground">
                    {avgScore != null ? `${avgScore}%` : '—'}
                  </td>
                  <td className="py-3 pr-4 text-foreground">{completionRate}%</td>
                  <td className="py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
