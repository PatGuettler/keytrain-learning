import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react'
import { ModuleEditor } from '@/components/admin/ModuleEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Module } from '@/types/course.types'

function SortableModuleRow({
  module,
  expanded,
  onToggle,
  onDelete,
}: {
  module: Module
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: module.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <button type="button" {...attributes} {...listeners} className="cursor-grab shrink-0">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left min-w-0"
          onClick={onToggle}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="font-medium truncate">{module.title}</span>
          <span className="text-xs text-muted-foreground capitalize shrink-0">{module.type}</span>
        </button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive shrink-0"
          onClick={onDelete}
          aria-label={`Remove ${module.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface CourseBuilderProps {
  title: string
  description: string
  estimatedMinutes: number
  modules: Module[]
  onTitleChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onEstimatedMinutesChange: (v: number) => void
  onModulesReorder: (modules: Module[]) => void
  onModuleChange: (moduleId: string, patch: Partial<Module>) => void
  onModuleDelete: (moduleId: string) => void
  onAddModule: (type: 'lesson' | 'quiz' | 'workshop') => void
  onPublishToggle?: (published: boolean) => void
  isPublished?: boolean
}

export function CourseBuilder({
  title,
  description,
  estimatedMinutes,
  modules,
  onTitleChange,
  onDescriptionChange,
  onEstimatedMinutesChange,
  onModulesReorder,
  onModuleChange,
  onModuleDelete,
  onAddModule,
  onPublishToggle,
  isPublished,
}: CourseBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = modules.findIndex((m) => m.id === active.id)
    const newIndex = modules.findIndex((m) => m.id === over.id)
    onModulesReorder(arrayMove(modules, oldIndex, newIndex).map((m, i) => ({ ...m, order_index: i })))
  }

  const toggleModule = (id: string) => {
    setExpandedId((current) => (current === id ? null : id))
  }

  const expandedModule = modules.find((m) => m.id === expandedId)

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => onTitleChange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
        <div className="space-y-2 max-w-xs">
          <Label>Estimated duration (minutes)</Label>
          <Input
            type="number"
            min={1}
            value={estimatedMinutes}
            onChange={(e) => onEstimatedMinutesChange(parseInt(e.target.value, 10) || 30)}
          />
        </div>
        {onPublishToggle && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublished} onChange={(e) => onPublishToggle(e.target.checked)} />
            Published
          </label>
        )}
      </div>

      <div>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <div>
            <h3 className="font-semibold">Modules</h3>
            <p className="text-xs text-muted-foreground">
              Add lessons, quizzes, and workshops. Expand a module to edit slides, questions, and
              scenarios.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['lesson', 'quiz', 'workshop'] as const).map((t) => (
              <Button key={t} size="sm" variant="outline" onClick={() => onAddModule(t)}>
                <Plus className="h-3 w-3 mr-1" /> {t}
              </Button>
            ))}
          </div>
        </div>

        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-6 text-center">
            No modules yet. Add a lesson, quiz, or workshop to start building content.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {modules.map((m) => (
                  <div key={m.id} className="space-y-0">
                    <SortableModuleRow
                      module={m}
                      expanded={expandedId === m.id}
                      onToggle={() => toggleModule(m.id)}
                      onDelete={() => {
                        if (expandedId === m.id) setExpandedId(null)
                        onModuleDelete(m.id)
                      }}
                    />
                    {expandedId === m.id && (
                      <div className="mt-2 ml-6">
                        <ModuleEditor
                          module={m}
                          onChange={(patch) => onModuleChange(m.id, patch)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {expandedModule && expandedId && (
          <p className="text-xs text-muted-foreground mt-3">
            Editing: <strong>{expandedModule.title}</strong> — click Save course when finished.
          </p>
        )}
      </div>
    </div>
  )
}
