import { seedCourses, seedModules } from '@/data/courses'
import { cloneModulesForBuilder } from '@/lib/module-defaults'
import type { Module } from '@/types/course.types'

const INCIDENT_COURSE_ID = '10000000-0000-0000-0000-000000000001'

export function getIncidentAwarenessTemplate(): {
  title: string
  description: string
  estimated_minutes: number
  modules: Module[]
} {
  const course = seedCourses.find((c) => c.id === INCIDENT_COURSE_ID)
  const modules = seedModules.filter((m) => m.course_id === INCIDENT_COURSE_ID)

  if (!course || modules.length === 0) {
    throw new Error('Incident Awareness template not found in seed data.')
  }

  return {
    title: course.title,
    description: course.description,
    estimated_minutes: course.estimated_minutes,
    modules: cloneModulesForBuilder(modules),
  }
}
