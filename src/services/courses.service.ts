import { backend } from '@/backend'
import type { Course, Module } from '@/types/course.types'

export async function fetchCourses(orgId: string, publishedOnly = false): Promise<Course[]> {
  return backend.courses.fetchCourses(orgId, publishedOnly)
}

export async function fetchCourse(id: string): Promise<Course | null> {
  return backend.courses.fetchCourse(id)
}

export async function fetchModules(courseId: string): Promise<Module[]> {
  return backend.courses.fetchModules(courseId)
}

export async function upsertCourse(course: Partial<Course> & { org_id: string; title: string }) {
  return backend.courses.upsertCourse(course)
}

export async function upsertModule(module: Partial<Module> & { course_id: string; title: string; type: Module['type'] }) {
  return backend.courses.upsertModule(module)
}

export async function deleteModule(id: string) {
  return backend.courses.deleteModule(id)
}
