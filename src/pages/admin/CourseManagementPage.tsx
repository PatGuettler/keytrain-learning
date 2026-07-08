import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchHospitalCourses } from '@/services/courses.service'
import {
  fetchPublicationsForCourse,
  publishCourseToOrgs,
  unpublishCourseEverywhere,
} from '@/services/course-publications.service'
import { fetchHospitalOrganizations } from '@/services/organizations.service'
import { fetchTrainingTags } from '@/services/training-tags.service'
import { PublishToAllOrgsDialog } from '@/components/admin/PublishToAllOrgsDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import type { CoursePublication } from '@/types/course.types'

function isActive(pub: CoursePublication): boolean {
  if (pub.unpublished_at) return false
  if (pub.available_until && new Date(pub.available_until) <= new Date()) return false
  return true
}

function CourseRowActions({
  courseId,
  courseTitle,
}: {
  courseId: string
  courseTitle: string
}) {
  const userId = useAuthStore((s) => s.userId)!
  const queryClient = useQueryClient()
  const [publishOpen, setPublishOpen] = useState(false)

  const { data: hospitals = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchHospitalOrganizations,
  })
  const { data: publications = [] } = useQuery({
    queryKey: ['course-publications', courseId],
    queryFn: () => fetchPublicationsForCourse(courseId),
  })

  const active = publications.filter(isActive)
  const activeOrgIds = new Set(active.map((p) => p.org_id))
  const unpublishedOrgIds = hospitals.filter((h) => !activeOrgIds.has(h.id)).map((h) => h.id)
  const showPublishAll = hospitals.length > 0 && unpublishedOrgIds.length > 0

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['course-publications', courseId] })
    void queryClient.invalidateQueries({ queryKey: ['hospital-courses'] })
    void queryClient.invalidateQueries({ queryKey: ['assignments'] })
  }

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishCourseEverywhere(courseId),
    onSuccess: invalidate,
  })

  const publishAllMutation = useMutation({
    mutationFn: () => publishCourseToOrgs(courseId, unpublishedOrgIds, userId, null),
    onSuccess: () => {
      invalidate()
      setPublishOpen(false)
    },
  })

  const handleUnpublish = () => {
    const names = active
      .map((p) => hospitals.find((h) => h.id === p.org_id)?.name ?? 'organization')
      .join(', ')
    const confirmed = window.confirm(
      `Unpublish from ${names}? Staff will no longer be able to take this course.`
    )
    if (!confirmed) return
    unpublishMutation.mutate()
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {active.length === 0 ? (
          <Badge variant="secondary" className="shrink-0">
            Not published
          </Badge>
        ) : (
          <>
            <Badge variant="success" className="shrink-0">
              Live in {active.length} organization{active.length === 1 ? '' : 's'}
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
          </>
        )}
        {showPublishAll && (
          <Button
            type="button"
            size="sm"
            disabled={publishAllMutation.isPending}
            onClick={() => setPublishOpen(true)}
          >
            Publish
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link to={`/admin/courses/${courseId}/edit`}>Edit &amp; publish</Link>
        </Button>
      </div>

      <PublishToAllOrgsDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        courseTitle={courseTitle}
        organizationCount={unpublishedOrgIds.length}
        alreadyPublishedCount={active.length}
        publishing={publishAllMutation.isPending}
        onConfirm={() => publishAllMutation.mutate()}
      />
    </>
  )
}

export function CourseManagementPage() {
  const [tagFilter, setTagFilter] = useState<'all' | string>('all')
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['hospital-courses'],
    queryFn: fetchHospitalCourses,
  })
  const { data: tags = [] } = useQuery({
    queryKey: ['training-tags'],
    queryFn: fetchTrainingTags,
  })

  const filteredCourses = courses.filter((course) => {
    if (tagFilter === 'all') return true
    return (course.tags ?? []).some((tag) => tag.id === tagFilter)
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Course Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Use Publish for a quick publish to all organizations, or Edit for per-organization settings.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/courses/create">
            <Plus className="h-4 w-4 mr-1" /> New Course
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="tag-filter" className="text-sm text-muted-foreground">
          Filter by tag
        </Label>
        <select
          id="tag-filter"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="all">All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading courses…</p>
      ) : filteredCourses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {courses.length === 0 ? 'No courses yet. Create one to get started.' : 'No courses match this tag.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredCourses.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    {(c.tags ?? []).map((tag) => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))}
                    {(c.tags ?? []).length === 0 && (
                      <Badge variant="outline">No tags</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.estimated_minutes} min</p>
                </div>
                <CourseRowActions courseId={c.id} courseTitle={c.title} />
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
