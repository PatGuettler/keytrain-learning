import { getSupabase, isSupabaseConfigured } from './supabase'
import { demoCourses, getDemoCourses, getDemoModules } from './demo-data'
import type { Course, Module } from '@/types/course.types'
import type { Database, Json } from '@/types/database.types'

type CourseInsert = Database['public']['Tables']['courses']['Insert']
type CourseUpdate = Database['public']['Tables']['courses']['Update']
type ModuleInsert = Database['public']['Tables']['modules']['Insert']
type ModuleUpdate = Database['public']['Tables']['modules']['Update']

function toModuleInsert(
  module: Partial<Module> & { course_id: string; title: string; type: Module['type'] }
): ModuleInsert {
  const { content, ...rest } = module
  return {
    ...rest,
    content: content as Json | undefined,
  }
}

export async function fetchCourses(orgId: string, publishedOnly = false): Promise<Course[]> {
  if (!isSupabaseConfigured) return getDemoCourses(publishedOnly)
  const supabase = getSupabase()!
  let q = supabase.from('courses').select('*').eq('org_id', orgId).order('title')
  if (publishedOnly) q = q.eq('is_published', true)
  const { data, error } = await q
  if (error) throw error
  return data as Course[]
}

export async function fetchCourse(id: string): Promise<Course | null> {
  if (!isSupabaseConfigured) return demoCourses.find((c) => c.id === id) ?? null
  const { data, error } = await getSupabase()!.from('courses').select('*').eq('id', id).single()
  if (error) return null
  return data as Course
}

export async function fetchModules(courseId: string): Promise<Module[]> {
  if (!isSupabaseConfigured) return getDemoModules(courseId)
  const { data, error } = await getSupabase()!
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index')
  if (error) throw error
  return data as Module[]
}

export async function upsertCourse(course: Partial<Course> & { org_id: string; title: string }) {
  if (!isSupabaseConfigured) return course as Course
  const supabase = getSupabase()!
  if (course.id) {
    const { data, error } = await supabase
      .from('courses')
      .update(course as CourseUpdate)
      .eq('id', course.id)
      .select()
      .single()
    if (error) throw error
    return data as Course
  }
  const { data, error } = await supabase.from('courses').insert(course as CourseInsert).select().single()
  if (error) throw error
  return data as Course
}

export async function upsertModule(module: Partial<Module> & { course_id: string; title: string; type: Module['type'] }) {
  if (!isSupabaseConfigured) return module as Module
  const supabase = getSupabase()!
  const row = toModuleInsert(module)
  if (module.id) {
    const { data, error } = await supabase
      .from('modules')
      .update(row as ModuleUpdate)
      .eq('id', module.id)
      .select()
      .single()
    if (error) throw error
    return data as Module
  }
  const { data, error } = await supabase.from('modules').insert(row).select().single()
  if (error) throw error
  return data as Module
}

export async function deleteModule(id: string) {
  if (!isSupabaseConfigured) return
  await getSupabase()!.from('modules').delete().eq('id', id)
}
