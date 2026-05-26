import { Label } from '@/components/ui/label'
import type { WorkshopContent, WorkshopType } from '@/types/workshop.types'

const WORKSHOP_TYPES: WorkshopType[] = ['node_map', 'decision_tree', 'sorting', 'hotspot']

/** Configure interactive workshop nodes (type-specific UI). */
export function WorkshopEditor({
  content,
  onChange,
}: {
  content: WorkshopContent
  onChange: (content: WorkshopContent) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Workshop type</Label>
        <select
          className="w-full h-10 rounded-md border px-3 text-sm"
          value={content.workshop_type}
          onChange={(e) =>
            onChange({ ...content, workshop_type: e.target.value as WorkshopType })
          }
        >
          {WORKSHOP_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted-foreground">{content.instructions}</p>
      <p className="text-xs text-muted-foreground">
        Node placement, scenarios, and categories are edited via the JSON config in the course builder.
      </p>
    </div>
  )
}
