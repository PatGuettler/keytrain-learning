import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeCourseMetrics } from '@/lib/dashboard-stats'
import { courseStatusLabelForOrg } from '@/lib/course-publications'
import type { Assignment, Course, CoursePublication } from '@/types/course.types'

export function OrgCourseTable({
  orgSlug,
  orgId,
  publications = [],
  courses,
  assignments,
  courseDetailBasePath,
  getCourseDetailPath,
}: {
  orgSlug: string
  orgId?: string
  publications?: CoursePublication[]
  courses: Course[]
  assignments: Assignment[]
  /** When omitted, rows are display-only (no deep link). Legacy admin path pattern. */
  courseDetailBasePath?: string
  /** Preferred: direct path builder for course detail. */
  getCourseDetailPath?: (courseId: string) => string
}) {
  const navigate = useNavigate()
  const rows = computeCourseMetrics(courses, assignments)

  const statusLabel = (course: Course) => {
    if (!orgId) {
      return course.publication && !course.publication.unpublished_at ? 'Published' : 'Draft'
    }
    return courseStatusLabelForOrg(course, orgId, publications)
  }

  const statusVariant = (course: Course) =>
    statusLabel(course) === 'Published' ? 'success' : 'secondary'

  const openCourse = (courseId: string) => {
    if (getCourseDetailPath) {
      navigate(getCourseDetailPath(courseId))
      return
    }
    if (!courseDetailBasePath) return
    navigate(`${courseDetailBasePath}/${orgSlug}/courses/${courseId}`)
  }

  const canNavigate = Boolean(getCourseDetailPath || courseDetailBasePath)

  if (courses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No courses for this organization yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Courses</CardTitle>
        {canNavigate && (
          <p className="text-xs text-muted-foreground mt-1">
            Open a course to view training gaps and staff progress.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ul className="md:hidden space-y-3">
          {rows.map(({ course, assignmentCount, completedCount, completionRate, overdueCount, avgScore }) => (
            <li key={course.id}>
              <button
                type="button"
                onClick={() => openCourse(course.id)}
                disabled={!canNavigate}
                className={`w-full rounded-lg border p-4 text-left space-y-2 ${
                  canNavigate ? 'hover:bg-muted/50 transition-colors' : 'cursor-default'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-snug text-foreground">{course.title}</p>
                  <Badge variant={statusVariant(course)}>
                    {statusLabel(course)}
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
                  className={`border-b last:border-0 ${
                    canNavigate
                      ? 'cursor-pointer hover:bg-muted/50 transition-colors'
                      : ''
                  }`}
                >
                  <td className="py-3 pr-4 font-medium text-primary">{course.title}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={statusVariant(course)}>
                      {statusLabel(course)}
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
                    {canNavigate ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : null}
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
