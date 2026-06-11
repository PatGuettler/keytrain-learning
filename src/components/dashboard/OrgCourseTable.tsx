import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeCourseMetrics } from '@/lib/dashboard-stats'
import type { Assignment, Course } from '@/types/course.types'

export function OrgCourseTable({
  courses,
  assignments,
}: {
  courses: Course[]
  assignments: Assignment[]
}) {
  const rows = computeCourseMetrics(courses, assignments)

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
      </CardHeader>
      <CardContent>
        <ul className="md:hidden space-y-3">
          {rows.map(({ course, assignmentCount, completedCount, completionRate, overdueCount }) => (
            <li key={course.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-snug">{course.title}</p>
                <Badge variant={course.is_published ? 'success' : 'secondary'}>
                  {course.is_published ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {course.estimated_minutes} min · {assignmentCount} assigned · {completedCount} completed ·{' '}
                {completionRate}% rate
                {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/admin/courses/${course.id}/edit`}>Edit course</Link>
              </Button>
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
                <th className="pb-2 pr-4">Rate</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ course, assignmentCount, completedCount, completionRate, overdueCount }) => (
                <tr key={course.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{course.title}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={course.is_published ? 'success' : 'secondary'}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">{course.estimated_minutes} min</td>
                  <td className="py-3 pr-4">{assignmentCount}</td>
                  <td className="py-3 pr-4">
                    {completedCount}
                    {overdueCount > 0 && (
                      <span className="text-destructive ml-1">({overdueCount} overdue)</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">{completionRate}%</td>
                  <td className="py-3 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/courses/${course.id}/edit`}>Edit</Link>
                    </Button>
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
