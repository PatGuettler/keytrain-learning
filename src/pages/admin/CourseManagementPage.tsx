import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchHospitalCourses } from '@/services/courses.service'
import { fetchPublicationsForCourse, unpublishCourseEverywhere } from '@/services/course-publications.service'
import { fetchHospitalOrganizations } from '@/services/organizations.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import type { CoursePublication } from '@/types/course.types'

function isActive(pub: CoursePublication): boolean {
  if (pub.unpublished_at) return false
  if (pub.available_until && new Date(pub.available_until) <= new Date()) return false
  return true
}

function CoursePublicationSummary({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient()
  const { data: hospitals = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchHospitalOrganizations,
  })
  const { data: publications = [] } = useQuery({
    queryKey: ['course-publications', courseId],
    queryFn: () => fetchPublicationsForCourse(courseId),
  })

  const active = publications.filter(isActive)

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishCourseEverywhere(courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['course-publications', courseId] })
      void queryClient.invalidateQueries({ queryKey: ['hospital-courses'] })
      void queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })

  if (active.length === 0) {
    return (
      <Badge variant="secondary" className="shrink-0">
        Not published
      </Badge>
    )
  }

  const handleUnpublish = () => {
    const names = active
      .map((p) => hospitals.find((h) => h.id === p.org_id)?.name ?? 'hospital')
      .join(', ')
    const confirmed = window.confirm(
      `Unpublish from ${names}? Staff will no longer be able to take this course.`
    )
    if (!confirmed) return
    unpublishMutation.mutate()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="success" className="shrink-0">
        Live in {active.length} hospital{active.length === 1 ? '' : 's'}
      </Badge>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/40 hover:bg-destructive/10"
        disabled={unpublishMutation.isPending}
        onClick={handleUnpublish}
      >
        {unpublishMutation.isPending ? 'Unpublishing…' : 'Unpublish'}
      </Button>
    </div>
  )
}

export function CourseManagementPage() {
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['hospital-courses'],
    queryFn: fetchHospitalCourses,
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Course Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Unpublish removes a course from staff training immediately. Use Edit for full publish
            settings per hospital.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/courses/create">
            <Plus className="h-4 w-4 mr-1" /> New Course
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading courses…</p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses yet. Create one to get started.</p>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                <div className="min-w-0">
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{c.estimated_minutes} min</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <CoursePublicationSummary courseId={c.id} />
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/courses/${c.id}/edit`}>Edit &amp; publish</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
