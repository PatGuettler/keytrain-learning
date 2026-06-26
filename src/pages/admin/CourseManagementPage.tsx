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
import { PublishToAllOrgsDialog } from '@/components/admin/PublishToAllOrgsDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import {
  TRAINING_CATEGORIES,
  TRAINING_CATEGORY_LABELS,
  type TrainingCategory,
} from '@/lib/training-categories'
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
      .map((p) => hospitals.find((h) => h.id === p.org_id)?.name ?? 'hospital')
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
  const [categoryFilter, setCategoryFilter] = useState<'all' | TrainingCategory>('all')
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['hospital-courses'],
    queryFn: fetchHospitalCourses,
  })

  const filteredCourses = courses.filter(
    (course) => categoryFilter === 'all' || (course.training_category ?? 'healthcare') === categoryFilter
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Course Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Use Publish for a quick publish to all hospitals, or Edit for per-hospital settings.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/courses/create">
            <Plus className="h-4 w-4 mr-1" /> New Course
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="category-filter" className="text-sm text-muted-foreground">
          Category
        </Label>
        <select
          id="category-filter"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'all' | TrainingCategory)}
        >
          <option value="all">All industries</option>
          {TRAINING_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {TRAINING_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading courses…</p>
      ) : filteredCourses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {courses.length === 0 ? 'No courses yet. Create one to get started.' : 'No courses match this category.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredCourses.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    <Badge variant="secondary">
                      {TRAINING_CATEGORY_LABELS[(c.training_category ?? 'healthcare') as TrainingCategory] ??
                        c.training_category}
                    </Badge>
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
