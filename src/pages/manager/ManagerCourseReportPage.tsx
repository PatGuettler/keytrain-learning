import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, TrendingUp, Award, AlertTriangle } from 'lucide-react'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { OrgCourseStaffDirectory } from '@/components/dashboard/OrgCourseStaffDirectory'
import { StatCard } from '@/components/dashboard/StatCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useManagerCourseReport } from '@/hooks/useManagerTrainingReports'
import { computeCourseMetrics } from '@/lib/dashboard-stats'
import { exportOrgCoursePdf } from '@/lib/pdf/dashboard-reports'

export function ManagerCourseReportPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { organization, course, staffRows, courseAssignments, isLoading } =
    useManagerCourseReport(courseId)

  const courseMetrics = useMemo(() => {
    if (!course) return null
    return computeCourseMetrics([course], courseAssignments)[0] ?? null
  }, [course, courseAssignments])

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading course report…</p>
  }

  if (!course || !courseMetrics) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Course not found on your team.</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/manager/reports">Back to training reports</Link>
        </Button>
      </div>
    )
  }

  const orgName = organization?.name ?? 'My team'

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/manager/reports">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Training reports
          </Link>
        </Button>
        <ExportPdfButton
          allowNonAdmin
          label="Download report (PDF)"
          onExport={() =>
            exportOrgCoursePdf(orgName, course, courseMetrics, [], staffRows)
          }
        />
      </div>

      <div className="space-y-2">
        <PageHeader title={course.title} description={course.description ?? 'Team grades for this course'} />
        <Badge variant={course.is_published ? 'success' : 'secondary'}>
          {course.is_published ? 'Published' : 'Unpublished'}
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

      <OrgCourseStaffDirectory
        rows={staffRows}
        getStaffCoursePath={(userId) =>
          `/manager/reports/courses/${courseId}/staff/${userId}`
        }
      />
    </div>
  )
}
