import type { CourseExportBundle } from '@/lib/course-export'
import { COURSE_EXPORT_VERSION } from '@/lib/course-export'
import { newQuestionId } from '@/lib/module-defaults'
import { getTrendReportingPeriod } from '@/lib/hive-records'
import type { HiveRecord } from '@/types/hive.types'

type AwsQuestion = {
  id?: string
  question?: string
  options?: string[]
  correct_answer?: string
  Explain?: string
  domain?: string
}

function optionId(index: number): string {
  return String.fromCharCode(97 + index)
}

function mapAwsQuestion(raw: AwsQuestion, index: number) {
  const options = Array.isArray(raw.options) ? raw.options : []
  const correctAnswer = typeof raw.correct_answer === 'string' ? raw.correct_answer : ''
  return {
    id: raw.id ?? newQuestionId(),
    text: raw.question?.trim() || `Question ${index + 1}`,
    type: 'single_select' as const,
    options: options.map((text, optIndex) => ({
      id: optionId(optIndex),
      text,
      correct: text === correctAnswer,
    })),
    explanation: raw.Explain ?? '',
  }
}

export function hiveAssignmentToCourseBundle(assignment: HiveRecord): CourseExportBundle {
  const orgId = String(assignment.hive_org_id ?? assignment.org_id ?? 'org')
  const period =
    typeof assignment.reporting_period === 'string'
      ? assignment.reporting_period
      : getTrendReportingPeriod(assignment)
  const weakDomains = Array.isArray(assignment.weak_domains)
    ? assignment.weak_domains.map(String)
    : []
  const questionsRaw = Array.isArray(assignment.questions) ? (assignment.questions as AwsQuestion[]) : []
  const questions = questionsRaw.map(mapAwsQuestion)

  const title =
    weakDomains.length > 0
      ? `RailNet Training — ${period} (${weakDomains.slice(0, 2).join(', ')})`
      : `RailNet Training — ${period}`

  const description = [
    `AI-proposed training for ${orgId}.`,
    assignment.assignment_type ? `Type: ${String(assignment.assignment_type)}.` : '',
    weakDomains.length ? `Focus: ${weakDomains.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const estimatedMinutes = Math.max(15, Math.min(120, questions.length * 2))

  return {
    version: COURSE_EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    course: {
      title,
      description,
      estimated_minutes: estimatedMinutes,
      max_attempts: 3,
      show_results_after_completion: true,
    },
    modules: [
      {
        title: weakDomains[0] ? `Quiz — ${weakDomains[0]}` : 'RailNet training quiz',
        type: 'quiz',
        order_index: 0,
        content: {
          passing_score: 80,
          randomize_questions: true,
          questions,
        },
      },
    ],
  }
}
