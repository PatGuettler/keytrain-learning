import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WorkshopContent, SortingConfig } from '@/types/workshop.types'

function DraggableCard({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'rounded-md border bg-card px-3 py-2 text-sm cursor-grab shadow-sm',
        isDragging && 'opacity-50'
      )}
    >
      {text}
    </div>
  )
}

function DropColumn({
  id,
  label,
  cards,
  locked,
}: {
  id: string
  label: string
  cards: { id: string; text: string }[]
  locked?: Set<string>
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-2 rounded-lg border-2 border-dashed p-3 min-h-[120px] bg-muted/30',
        isOver && 'border-primary'
      )}
    >
      <h4 className="font-semibold text-sm">{label}</h4>
      {cards.map((c) => (
        <div
          key={c.id}
          className={cn(
            'rounded-md border bg-card px-3 py-2 text-sm',
            locked?.has(c.id) && 'border-emerald-500 bg-emerald-50',
            locked?.has(c.id) === false && 'border-destructive animate-shake'
          )}
        >
          {c.text}
        </div>
      ))}
    </div>
  )
}

export function SortingWorkshop({
  content,
  onComplete,
}: {
  content: WorkshopContent
  onComplete: (score?: number) => void
}) {
  const config = content.config as SortingConfig
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

  const unplaced = config.cards.filter((c) => !placements[c.id])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over?.id) setPlacements((p) => ({ ...p, [active.id as string]: over.id as string }))
  }

  const handleTapPlace = (categoryId: string) => {
    if (!selectedCard) return
    setPlacements((p) => ({ ...p, [selectedCard]: categoryId }))
    setSelectedCard(null)
  }

  const submit = () => {
    setSubmitted(true)
    const correct = new Set<string>()
    config.cards.forEach((c) => {
      if (placements[c.id] === c.category_id) correct.add(c.id)
    })
    setLocked(correct)
    const score = Math.round((correct.size / config.cards.length) * 100)
    if (score === 100) onComplete()
  }

  const cardsIn = (catId: string) =>
    config.cards.filter((c) => placements[c.id] === catId).map((c) => ({ id: c.id, text: c.text }))

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">{content.instructions}</p>

      {/* Mobile tap flow */}
      <div className="md:hidden space-y-2">
        <p className="text-xs font-medium">Tap a card, then tap a category</p>
        <div className="flex flex-wrap gap-2">
          {unplaced.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCard(c.id)}
              className={cn(
                'rounded border px-3 py-2 text-sm',
                selectedCard === c.id && 'border-primary bg-primary/10'
              )}
            >
              {c.text}
            </button>
          ))}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="hidden md:flex flex-wrap gap-2 mb-4 min-h-[48px]">
          {unplaced.map((c) => (
            <DraggableCard key={c.id} id={c.id} text={c.text} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {config.categories.map((cat) => (
            <div key={cat.id} onClick={() => handleTapPlace(cat.id)} className="md:contents">
              <DropColumn id={cat.id} label={cat.label} cards={cardsIn(cat.id)} locked={submitted ? locked : undefined} />
            </div>
          ))}
        </div>
      </DndContext>

      <Button onClick={submit} disabled={Object.keys(placements).length < config.cards.length}>
        Submit
      </Button>
    </div>
  )
}
