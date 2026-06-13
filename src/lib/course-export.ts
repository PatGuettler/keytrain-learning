import type { Course, Module } from '@/types/course.types'

export const COURSE_EXPORT_VERSION = 1

export interface CourseExportBundle {
  version: number
  exported_at: string
  course: {
    title: string
    description: string
    estimated_minutes: number
    max_attempts: number
  }
  modules: Array<{
    title: string
    type: Module['type']
    order_index: number
    content: Record<string, unknown>
  }>
}

export function exportCourseBundle(course: Course, modules: Module[]): CourseExportBundle {
  return {
    version: COURSE_EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    course: {
      title: course.title,
      description: course.description,
      estimated_minutes: course.estimated_minutes,
      max_attempts: course.max_attempts,
    },
    modules: [...modules]
      .sort((a, b) => a.order_index - b.order_index)
      .map(({ title, type, order_index, content }) => ({
        title,
        type,
        order_index,
        content: content ?? {},
      })),
  }
}

export function downloadCourseExport(course: Course, modules: Module[]) {
  const bundle = exportCourseBundle(course, modules)
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const slug = course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'course'
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug}-export.json`
  a.click()
  URL.revokeObjectURL(url)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export interface ImportedCourseDraft {
  title: string
  description: string
  estimated_minutes: number
  max_attempts: number
  modules: Array<{
    title: string
    type: Module['type']
    order_index: number
    content: Record<string, unknown>
  }>
  warnings: string[]
}

const VALID_MODULE_TYPES = new Set<Module['type']>(['lesson', 'quiz', 'workshop'])

export function parseCourseImport(raw: unknown): ImportedCourseDraft {
  const warnings: string[] = []
  const root = asRecord(raw)

  if (!root) {
    return {
      title: 'Imported course',
      description: '',
      estimated_minutes: 30,
      max_attempts: 3,
      modules: [],
      warnings: ['File was not a JSON object — using empty defaults.'],
    }
  }

  if (typeof root.version === 'number' && root.version > COURSE_EXPORT_VERSION) {
    warnings.push(
      `Export version ${root.version} is newer than this app supports — some fields may be missing.`
    )
  }

  const courseBlock = asRecord(root.course) ?? root
  const title =
    typeof courseBlock.title === 'string' && courseBlock.title.trim()
      ? courseBlock.title.trim()
      : 'Imported course'
  if (!courseBlock.title) warnings.push('Course title was missing — please set a title.')

  const description =
    typeof courseBlock.description === 'string' ? courseBlock.description : ''
  if (courseBlock.description == null) warnings.push('Course description was missing.')

  let estimated_minutes = 30
  if (typeof courseBlock.estimated_minutes === 'number' && courseBlock.estimated_minutes > 0) {
    estimated_minutes = Math.round(courseBlock.estimated_minutes)
  } else {
    warnings.push('Estimated minutes was missing — defaulting to 30.')
  }

  let max_attempts = 3
  if (typeof courseBlock.max_attempts === 'number' && courseBlock.max_attempts >= 0) {
    max_attempts = courseBlock.max_attempts
  } else {
    warnings.push('Max attempts was missing — defaulting to 3.')
  }

  const rawModules = Array.isArray(root.modules) ? root.modules : []
  if (!Array.isArray(root.modules)) warnings.push('Modules list was missing — add modules manually.')

  const modules = rawModules
    .map((item, index) => {
      const mod = asRecord(item)
      if (!mod) {
        warnings.push(`Module ${index + 1} was skipped (invalid shape).`)
        return null
      }
      const type = mod.type as Module['type']
      if (!VALID_MODULE_TYPES.has(type)) {
        warnings.push(`Module "${mod.title ?? index + 1}" had unknown type — defaulted to lesson.`)
      }
      return {
        title:
          typeof mod.title === 'string' && mod.title.trim()
            ? mod.title.trim()
            : `Module ${index + 1}`,
        type: VALID_MODULE_TYPES.has(type) ? type : 'lesson',
        order_index: typeof mod.order_index === 'number' ? mod.order_index : index,
        content: asRecord(mod.content) ?? {},
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => a.order_index - b.order_index)
    .map((m, i) => ({ ...m, order_index: i }))

  return { title, description, estimated_minutes, max_attempts, modules, warnings }
}
