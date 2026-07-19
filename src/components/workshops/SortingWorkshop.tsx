import { useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { BookOpen, Check, GripVertical, Lightbulb, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Module } from '@/types/course.types'
import type { ModuleCompletePayload } from '@/types/training.types'
import type { WorkshopContent, SortingConfig } from '@/types/workshop.types'

function DraggableCard({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    // Let dnd-kit own touch gestures on the card so touch-drag works reliably.
    touchAction: 'none' as const,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm select-none cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'opacity-40'
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span>{text}</span>
    </div>
  )
}

function DropColumn({
  id,
  label,
  cards,
  correctIds,
  wrongIds,
  submitted,
}: {
  id: string
  label: string
  cards: { id: string; text: string }[]
  correctIds: Set<string>
  wrongIds: Set<string>
  submitted: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: submitted })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-2 rounded-lg border-2 border-dashed p-3 min-h-[100px] bg-muted/30 transition-colors',
        isOver && 'border-primary bg-primary/5'
      )}
    >
      <h4 className="font-semibold text-sm">{label}</h4>
      {!submitted && cards.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Drop a card here</p>
      )}
      {cards.map((c) =>
        submitted ? (
          <div
            key={c.id}
            className={cn(
              'rounded-md border bg-card px-3 py-2 text-sm',
              correctIds.has(c.id) && 'border-emerald-500 bg-emerald-500/10',
              wrongIds.has(c.id) && 'border-destructive bg-destructive/10'
            )}
          >
            {c.text}
          </div>
        ) : (
          // Placed cards stay draggable so learners can re-sort before submitting.
          <DraggableCard key={c.id} id={c.id} text={c.text} />
        )
      )}
    </div>
  )
}

export function SortingWorkshop({
  content,
  modules,
  onComplete,
  onReviewLesson,
}: {
  content: WorkshopContent
  modules: Module[]
  onComplete: (result: ModuleCompletePayload) => void
  onReviewLesson: (moduleIndex: number) => void
}) {
  const config = content.config as SortingConfig
  const passingScore = config.passing_score ?? 70
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const { correctIds, wrongIds, score } = useMemo(() => {
    const correct = new Set<string>()
    const wrong = new Set<string>()
    config.cards.forEach((c) => {
      if (placements[c.id] === c.category_id) correct.add(c.id)
      else if (placements[c.id]) wrong.add(c.id)
    })
    const pct = config.cards.length
      ? Math.round((correct.size / config.cards.length) * 100)
      : 0
    return { correctIds: correct, wrongIds: wrong, score: pct }
  }, [config.cards, placements])

  const unplaced = config.cards.filter((c) => !placements[c.id])
  const wrongCards = config.cards.filter((c) => wrongIds.has(c.id))
  const passed = score >= passingScore
  const activeCard = activeId ? config.cards.find((c) => c.id === activeId) : null

  // Mouse for desktop; touch long-press for mobile so normal taps still scroll.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    if (submitted) return
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    if (submitted) return
    const { active, over } = event
    if (over?.id) setPlacements((p) => ({ ...p, [active.id as string]: over.id as string }))
  }

  const submit = () => {
    setSubmitted(true)
  }

  const finishAndSave = () => {
    onComplete({
      score,
      passed,
      interactions: {
        type: 'sorting',
        placements,
        correct_ids: [...correctIds],
        wrong_ids: [...wrongIds],
        submitted_at: new Date().toISOString(),
      },
    })
  }

  const cardsIn = (catId: string) =>
    config.cards.filter((c) => placements[c.id] === catId).map((c) => ({ id: c.id, text: c.text }))

  const categoryLabel = (id: string) => config.categories.find((c) => c.id === id)?.label ?? id

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{content.instructions}</p>

      {!submitted && (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <div className="rounded-lg border bg-muted/20 p-3 mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Drag each card into the matching category
                <span className="sm:hidden"> (press and hold to pick up)</span>
              </p>
              <div className="flex flex-wrap gap-2 min-h-[48px]">
                {unplaced.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic self-center">
                    All cards placed — review your columns, then submit.
                  </p>
                ) : (
                  unplaced.map((c) => <DraggableCard key={c.id} id={c.id} text={c.text} />)
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              {config.categories.map((cat) => (
                <DropColumn
                  key={cat.id}
                  id={cat.id}
                  label={cat.label}
                  cards={cardsIn(cat.id)}
                  correctIds={correctIds}
                  wrongIds={wrongIds}
                  submitted={false}
                />
              ))}
            </div>
            <DragOverlay>
              {activeCard ? (
                <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-lg">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{activeCard.text}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <Button
            onClick={submit}
            disabled={Object.keys(placements).length < config.cards.length}
            className="min-h-12 w-full sm:w-auto"
          >
            Submit answers
          </Button>
        </>
      )}

      {submitted && (
        <div className="space-y-4">
          <Card className={cn('border-2', passed ? 'border-emerald-500/50' : 'border-amber-500/50')}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">Your results</CardTitle>
                <Badge variant={passed ? 'success' : 'warning'}>
                  {score}% — {passed ? 'Passed' : 'Review recommended'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>{correctIds.size}</strong> of <strong>{config.cards.length}</strong> incidents
                sorted correctly. Results are saved to your training record.
              </p>
              {!passed && (
                <p className="text-muted-foreground">
                  Passing score is {passingScore}%. Review the hints below, then continue when ready.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 opacity-90">
            {config.categories.map((cat) => (
              <DropColumn
                key={cat.id}
                id={cat.id}
                label={cat.label}
                cards={cardsIn(cat.id)}
                correctIds={correctIds}
                wrongIds={wrongIds}
                submitted
              />
            ))}
          </div>

          {wrongCards.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Refresh your memory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {wrongCards.map((card) => {
                  const placedIn = placements[card.id]
                  const guide = config.category_guides?.[card.category_id]
                  const reviewIndex = guide?.review_module_index ?? 0
                  const reviewModule = modules[reviewIndex]
                  return (
                    <div key={card.id} className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">{card.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            You placed this in <strong>{categoryLabel(placedIn)}</strong> — correct
                            category: <strong>{categoryLabel(card.category_id)}</strong>
                          </p>
                        </div>
                      </div>
                      {card.hint && (
                        <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">
                          {card.hint}
                        </p>
                      )}
                      {guide?.summary && (
                        <p className="text-xs text-muted-foreground">{guide.summary}</p>
                      )}
                      {reviewModule && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-10"
                          onClick={() => onReviewLesson(reviewIndex)}
                        >
                          <BookOpen className="h-4 w-4 mr-1" />
                          Review: {reviewModule.title}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {wrongCards.length === 0 && (
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <Check className="h-5 w-5" />
              Perfect sorting — great work!
            </div>
          )}

          <Button className="min-h-12 w-full sm:w-auto" onClick={finishAndSave}>
            Continue
          </Button>
        </div>
      )}
    </div>
  )
}
