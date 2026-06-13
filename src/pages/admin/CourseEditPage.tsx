import { useEffect, useState } from 'react'
import { useMatch, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import { CourseBuilder } from '@/components/admin/CourseBuilder'
import { CoursePublishPanel } from '@/components/admin/CoursePublishPanel'
import { DeleteCourseCard } from '@/components/admin/DeleteCourseCard'
import { useCourse, useModules } from '@/hooks/useCourses'
import { getIncidentAwarenessTemplate } from '@/lib/course-templates'
import { createEmptyModule } from '@/lib/module-defaults'
import { parseCourseImport, downloadCourseExport } from '@/lib/course-export'
import { syncCourseModules, upsertCourse, upsertModule } from '@/services/courses.service'
import { useAuthStore } from '@/store/authStore'
import type { Module } from '@/types/course.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CourseEditPage() {
  const { courseId } = useParams<{ courseId?: string }>()
  const isCreateRoute = useMatch('/admin/courses/create')
  const isNew = Boolean(isCreateRoute) || courseId === 'new'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const orgId = useAuthStore((s) => s.profile?.org_id)!
  const userId = useAuthStore((s) => s.userId)!
  const { data: course } = useCourse(isNew ? '' : courseId!)
  const { data: fetchedModules = [] } = useModules(isNew ? '' : courseId!)

  const [title, setTitle] = useState('New Course')
  const [description, setDescription] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(30)
  const [modules, setModules] = useState<Module[]>([])
  const [maxAttempts, setMaxAttempts] = useState(3)
  const [unlimitedAttempts, setUnlimitedAttempts] = useState(false)
  const [savedCourseId, setSavedCourseId] = useState(isNew ? '' : courseId!)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (course) {
      setTitle(course.title)
      setDescription(course.description)
      setEstimatedMinutes(course.estimated_minutes)
      if (course.max_attempts === 0) {
        setUnlimitedAttempts(true)
        setMaxAttempts(3)
      } else if (course.max_attempts) {
        setMaxAttempts(course.max_attempts)
        setUnlimitedAttempts(false)
      }
    }
  }, [course])

  useEffect(() => {
    if (!isNew && fetchedModules.length) setModules(fetchedModules)
  }, [isNew, fetchedModules])

  const updateModule = (moduleId: string, patch: Partial<Module>) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m
        return {
          ...m,
          ...patch,
          content: patch.content !== undefined ? patch.content : m.content,
        }
      })
    )
  }

  const deleteModule = (moduleId: string) => {
    setModules((prev) =>
      prev.filter((m) => m.id !== moduleId).map((m, index) => ({ ...m, order_index: index }))
    )
  }

  const addModule = (type: 'lesson' | 'quiz' | 'workshop') => {
    setModules((prev) => [...prev, createEmptyModule(type, prev.length, courseId ?? 'new')])
  }

  const loadTemplate = () => {
    const template = getIncidentAwarenessTemplate()
    setTitle(template.title)
    setDescription(template.description)
    setEstimatedMinutes(template.estimated_minutes)
    setModules(template.modules)
  }

  const save = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const saved = await upsertCourse({
        id: isNew ? undefined : courseId,
        org_id: orgId,
        title: title.trim() || 'Untitled course',
        description,
        is_published: course?.is_published ?? false,
        max_attempts: unlimitedAttempts ? 0 : Math.max(1, maxAttempts),
        estimated_minutes: Math.max(1, estimatedMinutes),
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
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save course')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{isNew ? 'Create Course' : 'Edit Course'}</h2>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">
            Build lessons with slides and illustrations, quizzes with scored questions, and
            interactive workshops (floor plan hotspots, sorting challenges). Save when ready, then
            publish to hospitals.
          </p>
        </div>
        {isNew && (
          <Button type="button" variant="outline" size="sm" onClick={loadTemplate}>
            <BookOpen className="h-4 w-4 mr-1" />
            Load Incident Awareness example
          </Button>
        )}
      </div>

      <div className="max-w-xs space-y-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={unlimitedAttempts}
            onChange={(e) => setUnlimitedAttempts(e.target.checked)}
            className="rounded border-input"
          />
          Unlimited attempts (no lockout)
        </label>
        {!unlimitedAttempts && (
          <>
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
              request. Changing a course to unlimited automatically unlocks locked assignments.
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Label className="sr-only">Import course JSON</Label>
        <Input
          type="file"
          accept="application/json,.json"
          className="max-w-sm"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            void file.text().then((text) => {
              try {
                const draft = parseCourseImport(JSON.parse(text))
                setTitle(draft.title)
                setDescription(draft.description)
                setEstimatedMinutes(draft.estimated_minutes)
                if (draft.max_attempts === 0) {
                  setUnlimitedAttempts(true)
                } else {
                  setUnlimitedAttempts(false)
                  setMaxAttempts(draft.max_attempts)
                }
                setModules(
                  draft.modules.map((m, i) => ({
                    ...createEmptyModule(m.type, i, courseId ?? 'new'),
                    title: m.title,
                    order_index: m.order_index,
                    content: m.content,
                  }))
                )
                if (draft.warnings.length) {
                  setSaveError(draft.warnings.join(' '))
                }
              } catch {
                setSaveError('Could not parse course file — check the JSON format.')
              }
            })
            e.target.value = ''
          }}
        />
        {course && !isNew && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadCourseExport(course, modules)}
          >
            Export course JSON
          </Button>
        )}
      </div>

      <CourseBuilder
        title={title}
        description={description}
        estimatedMinutes={estimatedMinutes}
        modules={modules}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onEstimatedMinutesChange={setEstimatedMinutes}
        onModulesReorder={setModules}
        onModuleChange={updateModule}
        onModuleDelete={deleteModule}
        onAddModule={addModule}
      />

      <div className="flex flex-wrap gap-2 items-center">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save course'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin/courses')}>
          Back to courses
        </Button>
        {saveError && <p className="text-sm text-destructive w-full">{saveError}</p>}
      </div>

      {savedCourseId && <CoursePublishPanel courseId={savedCourseId} publishedBy={userId} />}

      {savedCourseId && !isNew && (
        <DeleteCourseCard courseId={savedCourseId} courseTitle={course?.title ?? title} />
      )}
    </div>
  )
}
