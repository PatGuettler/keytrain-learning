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
import { GripVertical, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Module } from '@/types/course.types'

function SortableModule({ module }: { module: Module }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: module.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded border bg-card p-3">
      <button type="button" {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="flex-1 font-medium">{module.title}</span>
      <span className="text-xs text-muted-foreground capitalize">{module.type}</span>
    </div>
  )
}

interface CourseBuilderProps {
  title: string
  description: string
  modules: Module[]
  onTitleChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onModulesReorder: (modules: Module[]) => void
  onAddModule: (type: 'lesson' | 'quiz' | 'workshop') => void
  onPublishToggle?: (published: boolean) => void
  isPublished?: boolean
}

export function CourseBuilder({
  title,
  description,
  modules,
  onTitleChange,
  onDescriptionChange,
  onModulesReorder,
  onAddModule,
  onPublishToggle,
  isPublished,
}: CourseBuilderProps) {
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => onTitleChange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input value={description} onChange={(e) => onDescriptionChange(e.target.value)} />
        </div>
        {onPublishToggle && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublished} onChange={(e) => onPublishToggle(e.target.checked)} />
            Published
          </label>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Modules</h3>
          <div className="flex gap-2">
            {(['lesson', 'quiz', 'workshop'] as const).map((t) => (
              <Button key={t} size="sm" variant="outline" onClick={() => onAddModule(t)}>
                <Plus className="h-3 w-3 mr-1" /> {t}
              </Button>
            ))}
          </div>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {modules.map((m) => (
                <SortableModule key={m.id} module={m} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
