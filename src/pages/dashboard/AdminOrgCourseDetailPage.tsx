import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useOrgRoute } from '@/hooks/useOrgRoute'
import { adminOrgDashboardPath } from '@/lib/org-slugs'
import { ArrowLeft, BookOpen, TrendingUp, Award, AlertTriangle } from 'lucide-react'
import { OrgCourseStaffDirectory } from '@/components/dashboard/OrgCourseStaffDirectory'
import { OrgTrainingNeedsPanel } from '@/components/dashboard/OrgTrainingNeedsPanel'
import { StatCard } from '@/components/dashboard/StatCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useOrgDashboard } from '@/hooks/useAdminDashboard'
import {
  buildStaffTrainingRows,
  computeCourseMetrics,
  computeTrainingNeeds,
} from '@/lib/dashboard-stats'

export function AdminOrgCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { orgId, orgSlug } = useOrgRoute()
  const [searchParams] = useSearchParams()
  const highlightModuleId = searchParams.get('module')

  const { org, users, courses, assignments, moduleAttempts, isLoading } = useOrgDashboard(orgId)

  const course = courses.find((c) => c.id === courseId)
  const courseMetrics = useMemo(() => {
    if (!course) return null
    return computeCourseMetrics([course], assignments)[0] ?? null
  }, [course, assignments])

  const trainingNeeds = useMemo(() => {
    const needs = computeTrainingNeeds(moduleAttempts, courses).filter((n) => n.courseId === courseId)
    if (!highlightModuleId) return needs
    return [...needs].sort((a, b) => {
      if (a.moduleId === highlightModuleId) return -1
      if (b.moduleId === highlightModuleId) return 1
      return 0
    })
  }, [moduleAttempts, courses, courseId, highlightModuleId])

  const staffRows = useMemo(
    () => buildStaffTrainingRows(assignments, users).filter((r) => r.courseId === courseId),
    [assignments, users, courseId]
  )

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading course details…</p>
  }

  if (!org || !course || !courseMetrics) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Course not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link to={adminOrgDashboardPath(orgSlug!)}>Back to organization dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={adminOrgDashboardPath(orgSlug!)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {org.name}
        </Link>
      </Button>

      <div className="space-y-2">
        <PageHeader title={course.title} description={course.description ?? 'Course training overview'} />
        <Badge variant={course.is_published ? 'success' : 'secondary'}>
          {course.is_published ? 'Published' : 'Draft'}
        </Badge>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Assigned" value={courseMetrics.assignmentCount} icon={BookOpen} />
        <StatCard title="Completed" value={courseMetrics.completedCount} icon={TrendingUp} />
        <StatCard
          title="Avg score"
          value={courseMetrics.avgScore != null ? `${courseMetrics.avgScore}%` : '—'}
          icon={Award}
        />
        <StatCard title="Overdue" value={courseMetrics.overdueCount} icon={AlertTriangle} />
      </div>

      {trainingNeeds.length > 0 && (
        <OrgTrainingNeedsPanel needs={trainingNeeds} orgSlug={orgSlug!} highlightModuleId={highlightModuleId} />
      )}

      <OrgCourseStaffDirectory
        rows={staffRows}
        getStaffCoursePath={(userId) =>
          adminOrgDashboardPath(orgSlug!, 'staff', userId, 'courses', courseId!)
        }
      />
    </div>
  )
}
