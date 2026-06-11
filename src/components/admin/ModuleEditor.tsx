import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { LessonEditor } from '@/components/admin/LessonEditor'
import { QuizEditor } from '@/components/admin/QuizEditor'
import { WorkshopEditor } from '@/components/admin/WorkshopEditor'
import type { LessonContent, Module, QuizContent } from '@/types/course.types'
import type { WorkshopContent } from '@/types/workshop.types'

export function ModuleEditor({
  module,
  onChange,
}: {
  module: Module
  onChange: (patch: Partial<Module>) => void
}) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="space-y-2">
        <Label>Module title</Label>
        <Input value={module.title} onChange={(e) => onChange({ title: e.target.value })} />
      </div>

      <p className="text-xs text-muted-foreground capitalize">Type: {module.type}</p>

      {module.type === 'lesson' && (
        <LessonEditor
          content={module.content as unknown as LessonContent}
          onChange={(content) => onChange({ content: content as unknown as Record<string, unknown> })}
        />
      )}

      {module.type === 'quiz' && (
        <QuizEditor
          content={module.content as unknown as QuizContent}
          onChange={(content) => onChange({ content: content as unknown as Record<string, unknown> })}
        />
      )}

      {module.type === 'workshop' && (
        <WorkshopEditor
          content={module.content as unknown as WorkshopContent}
          onChange={(content) => onChange({ content: content as unknown as Record<string, unknown> })}
        />
      )}
    </div>
  )
}
