import { STATUS_LABELS, APP_NAME } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import {
  computeCourseMetrics,
  extractModuleIssues,
  staffOverallStatus,
  type StaffSummaryRow,
  type StaffTrainingRow,
  type TrainingNeed,
} from '@/lib/dashboard-stats'
import type { Assignment, Course, ModuleAttempt, TrainingSession } from '@/types/course.types'
import type { Profile } from '@/types/user.types'
import type { HospitalDashboardSummary } from '@/hooks/useAdminDashboard'
import type { OrgDashboardMetrics } from '@/lib/dashboard-stats'
import {
  addDataTable,
  addMetricsSection,
  addSectionHeading,
  createDashboardPdf,
  pdfStartY,
  saveDashboardPdf,
} from '@/lib/pdf/pdf-base'

function trainingNeedsSummaryRows(needs: TrainingNeed[], includeCourse: boolean): (string | number)[][] {
  return needs.map((need) => {
    const stats: (string | number)[] = [
      need.moduleTitle,
      need.moduleType,
      need.attemptCount,
      `${need.passRate}%`,
      `${need.avgScore}%`,
    ]
    return includeCourse ? [need.courseTitle, ...stats] : stats
  })
}

function trainingNeedIssueRows(
  needs: TrainingNeed[],
  includeCourse: boolean
): (string | number)[][] {
  return needs.flatMap((need) => {
    const issues = need.issues.length > 0 ? need.issues : ['—']
    return issues.map((issue) => {
      const row: (string | number)[] = [need.moduleTitle, issue]
      return includeCourse ? [need.courseTitle, ...row] : row
    })
  })
}

function addTrainingNeedsPdfSection(
  doc: ReturnType<typeof createDashboardPdf>,
  needs: TrainingNeed[],
  startY: number,
  options: { includeCourse: boolean }
): number {
  if (needs.length === 0) return startY

  let y = addSectionHeading(doc, 'Training needs', startY)
  y = addDataTable(
    doc,
    options.includeCourse
      ? ['Course', 'Module', 'Type', 'Attempts', 'Pass rate', 'Avg score']
      : ['Module', 'Type', 'Attempts', 'Pass rate', 'Avg score'],
    trainingNeedsSummaryRows(needs, options.includeCourse),
    y
  )

  y = addSectionHeading(doc, 'Missed questions & issues', y)
  return addDataTable(
    doc,
    options.includeCourse ? ['Course', 'Module', 'Issue'] : ['Module', 'Issue'],
    trainingNeedIssueRows(needs, options.includeCourse),
    y,
    options.includeCourse
      ? {
          0: { cellWidth: 42 },
          1: { cellWidth: 36 },
          2: { cellWidth: 'auto' },
        }
      : {
          0: { cellWidth: 48 },
          1: { cellWidth: 'auto' },
        }
  )
}

const STAFF_STATUS_LABELS: Record<string, string> = {
  completed: 'All complete',
  in_progress: 'In progress',
  pending: 'Not started',
  overdue: 'Overdue',
  none: 'No courses',
}

function staffStatusLabel(row: StaffSummaryRow): string {
  return STAFF_STATUS_LABELS[staffOverallStatus(row)]
}

function scoreText(score: number | null | undefined): string {
  return score != null ? `${score}%` : '—'
}

export function exportPlatformDashboardPdf(
  hospitals: HospitalDashboardSummary[],
  totals: {
    hospitalCount: number
    totalUsers: number
    totalCourses: number
    publishedCourses: number
    completionRate: number
    overdueCount: number
  }
) {
  const doc = createDashboardPdf(`${APP_NAME} Platform Dashboard`, 'Overview across all organizations')
  let y = pdfStartY('Overview across all organizations')

  y = addMetricsSection(
    doc,
    [
      { label: 'Organizations', value: String(totals.hospitalCount) },
      { label: 'Total staff', value: String(totals.totalUsers) },
      {
        label: 'Courses (published/total)',
        value: `${totals.publishedCourses}/${totals.totalCourses}`,
      },
      { label: 'Platform completion', value: `${totals.completionRate}%` },
      { label: 'Overdue assignments', value: String(totals.overdueCount) },
    ],
    y
  )

  y = addSectionHeading(doc, 'Organizations', y)
  addDataTable(
    doc,
    ['Organization', 'Staff', 'Courses', 'Published', 'Completion', 'Overdue'],
    hospitals.map(({ org, userCount, totalCourses, publishedCourses, completionRate, overdueCount }) => [
      org.name,
      userCount,
      totalCourses,
      publishedCourses,
      `${completionRate}%`,
      overdueCount,
    ]),
    y
  )

  saveDashboardPdf(doc, `platform-dashboard-${new Date().toISOString().slice(0, 10)}`)
}

export function exportOrgDashboardPdf(
  orgName: string,
  metrics: OrgDashboardMetrics,
  avgScore: number,
  staffRows: StaffSummaryRow[],
  courses: Course[],
  assignments: Assignment[],
  trainingNeeds: TrainingNeed[]
) {
  const doc = createDashboardPdf(`${orgName} Training Report`, 'Organization dashboard summary')
  let y = pdfStartY('Organization dashboard summary')

  y = addMetricsSection(
    doc,
    [
      { label: 'Staff', value: String(metrics.userCount) },
      {
        label: 'Courses (published/total)',
        value: `${metrics.publishedCourses}/${metrics.totalCourses}`,
      },
      { label: 'Completion rate', value: `${metrics.completionRate}%` },
      { label: 'Average score', value: `${avgScore}%` },
      { label: 'Overdue', value: String(metrics.overdueCount) },
      { label: 'In progress', value: String(metrics.inProgressCount) },
    ],
    y
  )

  y = addSectionHeading(doc, 'Staff training', y)
  y = addDataTable(
    doc,
    ['Name', 'Email', 'Role', 'Progress', 'Avg score', 'Status'],
    staffRows.map((row) => [
      row.userName,
      row.userEmail ?? '—',
      row.role,
      `${row.completedCourses}/${row.totalCourses} (${row.completionRate}%)`,
      scoreText(row.avgScore),
      staffStatusLabel(row),
    ]),
    y
  )

  const courseMetrics = computeCourseMetrics(courses, assignments)
  y = addSectionHeading(doc, 'Courses', y)
  y = addDataTable(
    doc,
    ['Course', 'Status', 'Assigned', 'Completed', 'Completion', 'Avg score', 'Overdue'],
    courseMetrics.map(({ course, assignmentCount, completedCount, completionRate, avgScore, overdueCount }) => [
      course.title,
      course.is_published ? 'Published' : 'Draft',
      assignmentCount,
      completedCount,
      `${completionRate}%`,
      scoreText(avgScore),
      overdueCount,
    ]),
    y
  )

  if (trainingNeeds.length > 0) {
    addTrainingNeedsPdfSection(doc, trainingNeeds, y, { includeCourse: true })
  }

  saveDashboardPdf(doc, `${orgName}-dashboard-${new Date().toISOString().slice(0, 10)}`)
}

export function exportOrgCoursePdf(
  orgName: string,
  course: Course,
  metrics: {
    assignmentCount: number
    completedCount: number
    inProgressCount: number
    overdueCount: number
    completionRate: number
    avgScore: number | null
  },
  trainingNeeds: TrainingNeed[],
  staffRows: StaffTrainingRow[]
) {
  const subtitle = `${orgName} · Course training report`
  const doc = createDashboardPdf(course.title, subtitle)
  let y = pdfStartY(subtitle)

  y = addMetricsSection(
    doc,
    [
      { label: 'Status', value: course.is_published ? 'Published' : 'Draft' },
      { label: 'Assigned', value: String(metrics.assignmentCount) },
      { label: 'Completed', value: String(metrics.completedCount) },
      { label: 'In progress', value: String(metrics.inProgressCount) },
      { label: 'Completion rate', value: `${metrics.completionRate}%` },
      { label: 'Average score', value: scoreText(metrics.avgScore) },
      { label: 'Overdue', value: String(metrics.overdueCount) },
    ],
    y
  )

  if (course.description?.trim()) {
    y = addSectionHeading(doc, 'Course description', y)
    const description = course.description.trim()
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    const lines = doc.splitTextToSize(description, 180)
    doc.text(lines, 14, y)
    y += lines.length * 4.2 + 6
  }

  if (trainingNeeds.length > 0) {
    y = addTrainingNeedsPdfSection(doc, trainingNeeds, y, { includeCourse: false })
  }

  y = addSectionHeading(doc, 'Staff on this course', y)
  addDataTable(
    doc,
    ['Name', 'Email', 'Due', 'Score', 'Attempts', 'Status'],
    staffRows.map((row) => [
      row.userName,
      row.userEmail ?? '—',
      formatDate(row.dueDate),
      scoreText(row.score),
      `${row.attemptsUsed}/${row.maxAttempts}${row.locked ? ' (locked)' : ''}`,
      STATUS_LABELS[row.status] ?? row.status,
    ]),
    y
  )

  saveDashboardPdf(
    doc,
    `${orgName}-${course.title}-course-${new Date().toISOString().slice(0, 10)}`
  )
}

export function exportStaffDashboardPdf(user: Profile, summary: StaffSummaryRow, courseRows: StaffTrainingRow[]) {
  const doc = createDashboardPdf(
    `${user.full_name} — Training Report`,
    user.email ?? 'Staff training record'
  )
  let y = pdfStartY(user.email ?? 'Staff training record')

  y = addMetricsSection(
    doc,
    [
      { label: 'Role', value: user.role },
      { label: 'Overall status', value: staffStatusLabel(summary) },
      {
        label: 'Courses complete',
        value: `${summary.completedCourses}/${summary.totalCourses}`,
      },
      { label: 'Completion rate', value: `${summary.completionRate}%` },
      { label: 'Average score', value: scoreText(summary.avgScore) },
      { label: 'Overdue courses', value: String(summary.overdueCourses) },
    ],
    y
  )

  y = addSectionHeading(doc, 'Courses', y)
  addDataTable(
    doc,
    ['Course', 'Due', 'Score', 'Attempts', 'Status'],
    courseRows.map((row) => [
      row.courseTitle,
      formatDate(row.dueDate),
      scoreText(row.score),
      `${row.attemptsUsed}/${row.maxAttempts}${row.locked ? ' (locked)' : ''}`,
      STATUS_LABELS[row.status] ?? row.status,
    ]),
    y
  )

  saveDashboardPdf(doc, `${user.full_name}-training-${new Date().toISOString().slice(0, 10)}`)
}

export function exportStaffCoursePdf(
  user: Profile,
  courseRow: StaffTrainingRow,
  sessions: TrainingSession[],
  moduleAttempts: ModuleAttempt[]
) {
  const courseSessions = sessions
    .filter((s) => s.course_id === courseRow.courseId)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  const courseModuleAttempts = moduleAttempts
    .filter((a) => a.module?.course_id === courseRow.courseId)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())

  const doc = createDashboardPdf(
    `${courseRow.courseTitle} — Course Report`,
    `${user.full_name} · ${user.email ?? 'Staff member'}`
  )
  let y = pdfStartY(`${user.full_name} · ${user.email ?? 'Staff member'}`)

  y = addMetricsSection(
    doc,
    [
      { label: 'Status', value: STATUS_LABELS[courseRow.status] ?? courseRow.status },
      { label: 'Score', value: scoreText(courseRow.score) },
      {
        label: 'Attempts',
        value: `${courseRow.attemptsUsed}/${courseRow.maxAttempts}${courseRow.locked ? ' (locked)' : ''}`,
      },
      { label: 'Due date', value: formatDate(courseRow.dueDate) },
    ],
    y
  )

  y = addSectionHeading(doc, 'Course attempt history', y)
  y = addDataTable(
    doc,
    ['Attempt', 'Completed', 'Score', 'Result'],
    courseSessions
      .filter((s) => s.completed_at)
      .map((session) => [
        session.attempt_number,
        formatDate(session.completed_at),
        scoreText(session.score != null ? Math.round(Number(session.score)) : null),
        session.passed ? 'Passed' : 'Failed',
      ]),
    y
  )

  y = addSectionHeading(doc, 'Module attempts & mistakes', y)
  addDataTable(
    doc,
    ['Module', 'Type', 'Date', 'Score', 'Result', 'Issues'],
    courseModuleAttempts.map((attempt) => {
      const issues = extractModuleIssues(attempt)
      const passed =
        attempt.interactions?.passed === true || (attempt.score != null && attempt.score >= 80)
      return [
        attempt.module?.title ?? 'Module',
        attempt.module?.type ?? '—',
        formatDate(attempt.completed_at),
        scoreText(attempt.score),
        passed ? 'Passed' : 'Needs review',
        issues.length > 0 ? issues.join('; ') : '—',
      ]
    }),
    y
  )

  saveDashboardPdf(
    doc,
    `${user.full_name}-${courseRow.courseTitle}-${new Date().toISOString().slice(0, 10)}`
  )
}
