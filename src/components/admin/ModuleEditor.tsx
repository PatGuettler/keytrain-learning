import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { Module } from '@/types/course.types'

/** Edit individual module title and type-specific content (extend per module type). */
export function ModuleEditor({
  module,
  onChange,
}: {
  module: Module
  onChange: (patch: Partial<Module>) => void
}) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label>Module title</Label>
        <Input value={module.title} onChange={(e) => onChange({ title: e.target.value })} />
      </div>
      <p className="text-sm text-muted-foreground capitalize">Type: {module.type}</p>
      <p className="text-xs text-muted-foreground">
        Full slide/quiz/workshop editors can be extended here. Content is stored as JSON in Supabase.
      </p>
    </div>
  )
}
