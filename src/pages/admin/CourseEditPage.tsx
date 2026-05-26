import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CourseBuilder } from '@/components/admin/CourseBuilder'
import { useCourse, useModules } from '@/hooks/useCourses'
import { upsertCourse, upsertModule } from '@/services/courses.service'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { demoModules } from '@/services/demo-data'

export function CourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const isNew = courseId === 'new'
  const navigate = useNavigate()
  const orgId = useAuthStore((s) => s.profile?.org_id)!
  const userId = useAuthStore((s) => s.userId)!
  const { data: course } = useCourse(isNew ? '' : courseId!)
  const { data: fetchedModules = [] } = useModules(isNew ? '' : courseId!)

  const [title, setTitle] = useState(course?.title ?? 'New Course')
  const [description, setDescription] = useState(course?.description ?? '')
  const [published, setPublished] = useState(course?.is_published ?? false)
  const [modules, setModules] = useState(
    isNew ? [] : fetchedModules.length ? fetchedModules : demoModules.filter((m) => m.course_id === courseId)
  )

  const save = async () => {
    const saved = await upsertCourse({
      id: isNew ? undefined : courseId,
      org_id: orgId,
      title,
      description,
      is_published: published,
      estimated_minutes: 30,
      created_by: userId,
    })
    for (const m of modules) {
      await upsertModule({ ...m, course_id: saved.id })
    }
    navigate('/admin/courses')
  }

  const addModule = (type: 'lesson' | 'quiz' | 'workshop') => {
    const content =
      type === 'lesson'
        ? { slides: [{ id: 's1', heading: 'New slide', body: '', layout: 'full-bleed' }] }
        : type === 'quiz'
          ? { passing_score: 80, questions: [] }
          : { workshop_type: 'node_map', title: 'Workshop', instructions: '', config: { nodes: [] } }
    setModules([
      ...modules,
      {
        id: `temp-${Date.now()}`,
        course_id: courseId ?? 'new',
        title: `New ${type}`,
        type,
        order_index: modules.length,
        content,
        created_at: new Date().toISOString(),
      },
    ])
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{isNew ? 'Create Course' : 'Edit Course'}</h2>
      <CourseBuilder
        title={title}
        description={description}
        modules={modules}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onModulesReorder={setModules}
        onAddModule={addModule}
        isPublished={published}
        onPublishToggle={setPublished}
      />
      <Button onClick={save}>Save Course</Button>
    </div>
  )
}
