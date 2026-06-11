import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CourseBuilder } from '@/components/admin/CourseBuilder'
import { CoursePublishPanel } from '@/components/admin/CoursePublishPanel'
import { useCourse, useModules } from '@/hooks/useCourses'
import { syncCourseModules, upsertCourse, upsertModule } from '@/services/courses.service'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
export function CourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const isNew = courseId === 'new'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.profile?.org_id)!
  const userId = useAuthStore((s) => s.userId)!
  const { data: course } = useCourse(isNew ? '' : courseId!)
  const { data: fetchedModules = [] } = useModules(isNew ? '' : courseId!)

  const [title, setTitle] = useState(course?.title ?? 'New Course')
  const [description, setDescription] = useState(course?.description ?? '')
  const [modules, setModules] = useState(isNew ? [] : fetchedModules)
  const [maxAttempts, setMaxAttempts] = useState(course?.max_attempts ?? 3)
  const [savedCourseId, setSavedCourseId] = useState(isNew ? '' : courseId!)

  useEffect(() => {
    if (!isNew && fetchedModules.length) setModules(fetchedModules)
  }, [isNew, fetchedModules])

  useEffect(() => {
    if (course?.max_attempts) setMaxAttempts(course.max_attempts)
  }, [course?.max_attempts])

  const save = async () => {
    const saved = await upsertCourse({
      id: isNew ? undefined : courseId,
      org_id: orgId,
      title,
      description,
      is_published: course?.is_published ?? false,
      max_attempts: Math.max(1, maxAttempts),
      estimated_minutes: 30,
      created_by: userId,
    })
    const savedModuleIds: string[] = []
    for (const m of modules) {
      const mod = await upsertModule({ ...m, course_id: saved.id })
      savedModuleIds.push(mod.id)
    }
    await syncCourseModules(saved.id, savedModuleIds)
    await queryClient.invalidateQueries({ queryKey: ['courses'] })
    await queryClient.invalidateQueries({ queryKey: ['course', saved.id] })
    await queryClient.invalidateQueries({ queryKey: ['modules', saved.id] })
    setSavedCourseId(saved.id)
    if (isNew) {
      navigate(`/admin/courses/${saved.id}/edit`, { replace: true })
    }
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
      <p className="text-sm text-muted-foreground max-w-2xl">
        There is one live version of each course — no history. Saving updates the course for every
        organization it is published to.
      </p>
      <div className="max-w-xs space-y-2">
        <Label htmlFor="max-attempts">Max attempts per user</Label>
        <Input
          id="max-attempts"
          type="number"
          min={1}
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10) || 1)}
        />
        <p className="text-xs text-muted-foreground">
          After this many failed completions, the user is locked until an admin approves an unlock
          request.
        </p>
      </div>
      <CourseBuilder
        title={title}
        description={description}
        modules={modules}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onModulesReorder={setModules}
        onAddModule={addModule}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={save}>Save course</Button>
        <Button variant="outline" onClick={() => navigate('/admin/courses')}>
          Back to courses
        </Button>
      </div>
      {savedCourseId && <CoursePublishPanel courseId={savedCourseId} publishedBy={userId} />}
    </div>
  )
}
