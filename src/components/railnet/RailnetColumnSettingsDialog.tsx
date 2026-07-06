import { useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ColumnDefinition, TableColumnPref } from '@/types/table-column-prefs.types'

type RailnetColumnSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  definitions: ColumnDefinition[]
  columnPrefs: TableColumnPref[]
  onReorder: (activeId: string, overId: string) => void
  onToggle: (columnId: string, visible: boolean) => void
  onReset: () => void
  isSaving?: boolean
}

function SortableColumnRow({
  def,
  pref,
  onToggle,
}: {
  def: ColumnDefinition
  pref: TableColumnPref
  onToggle: (visible: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: def.id,
    disabled: def.locked,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-md border bg-card px-3 py-2 ${
        isDragging ? 'opacity-80 shadow-md' : ''
      }`}
    >
      {def.locked ? (
        <span className="w-4 shrink-0" aria-hidden />
      ) : (
        <button
          type="button"
          className="cursor-grab shrink-0 text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${def.label}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={pref.visible}
          disabled={def.locked}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <span>{def.label}</span>
        {def.locked && <span className="text-xs text-muted-foreground">(required)</span>}
      </label>
    </div>
  )
}

export function RailnetColumnSettingsDialog({
  open,
  onOpenChange,
  definitions,
  columnPrefs,
  onReorder,
  onToggle,
  onReset,
  isSaving = false,
}: RailnetColumnSettingsDialogProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const prefsById = useMemo(
    () => new Map(columnPrefs.map((p) => [p.id, p])),
    [columnPrefs]
  )

  const orderedDefs = useMemo(
    () =>
      columnPrefs
        .map((p) => definitions.find((d) => d.id === p.id))
        .filter(Boolean) as ColumnDefinition[],
    [columnPrefs, definitions]
  )

  const sortableIds = orderedDefs.filter((d) => !d.locked).map((d) => d.id)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    onReorder(String(active.id), String(over.id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure columns</DialogTitle>
          <DialogDescription>
            Show, hide, and reorder columns. Drag the handle to rearrange. Widths adjust in the
            table header. Saved to your profile on all devices.
          </DialogDescription>
        </DialogHeader>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="max-h-[min(50vh,360px)] space-y-2 overflow-y-auto py-1">
              {orderedDefs.map((def) => {
                const pref = prefsById.get(def.id)
                if (!pref) return null
                return (
                  <SortableColumnRow
                    key={def.id}
                    def={def}
                    pref={pref}
                    onToggle={(visible) => onToggle(def.id, visible)}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onReset} disabled={isSaving}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to defaults
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {isSaving ? 'Saving…' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RailnetColumnsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      Columns
    </Button>
  )
}
