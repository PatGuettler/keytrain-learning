import type { Course } from '@/types/course.types'
import type { TrainingTag } from '@/types/training-tag.types'

export function attachTagsToCourses(
  courses: Course[],
  links: { course_id: string; tag_id: string }[],
  tags: TrainingTag[]
): Course[] {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]))
  const tagsByCourse = new Map<string, TrainingTag[]>()
  for (const link of links) {
    const tag = tagById.get(link.tag_id)
    if (!tag) continue
    const list = tagsByCourse.get(link.course_id) ?? []
    list.push(tag)
    tagsByCourse.set(link.course_id, list)
  }
  return courses.map((course) => ({
    ...course,
    tags: (tagsByCourse.get(course.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }))
}
