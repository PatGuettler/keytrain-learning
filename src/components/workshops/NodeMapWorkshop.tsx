import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Check, MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { HospitalFloorPlan } from './HospitalFloorPlan'
import type { WorkshopContent } from '@/types/workshop.types'
import type { NodeMapConfig } from '@/types/workshop.types'

export function NodeMapWorkshop({
  content,
  onComplete,
}: {
  content: WorkshopContent
  onComplete: () => void
}) {
  const config = content.config as NodeMapConfig
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [completed, setCompleted] = useState<Record<string, 'correct' | 'wrong'>>({})
  const [selected, setSelected] = useState<string | null>(null)

  const node = config.nodes.find((n) => n.id === activeNode)
  const completedCount = config.nodes.filter((n) => completed[n.id] === 'correct').length
  const allDone = config.nodes.every((n) => completed[n.id] === 'correct')
  const useBuiltInFloor = !config.background_image?.trim()

  const submitAnswer = () => {
    if (!node || !selected) return
    const correct = selected === node.question.correct_id
    setCompleted((c) => ({ ...c, [node.id]: correct ? 'correct' : 'wrong' }))
    if (correct) setActiveNode(null)
    setSelected(null)
  }

  if (allDone) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600">
          <Check className="h-8 w-8" />
        </div>
        <p className="text-lg font-semibold text-emerald-700">Floor sweep complete!</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          You identified and classified all reportable incidents on this ward.
        </p>
        <Button onClick={onComplete} className="min-h-12 w-full max-w-xs">
          Continue
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-foreground">{content.instructions}</p>
        <Badge variant="secondary" className="w-fit shrink-0">
          {completedCount} / {config.nodes.length} resolved
        </Badge>
      </div>

      {/* Scrollable map on mobile for panning a larger floor plan */}
      <div className="rounded-xl border bg-muted/30 overflow-hidden">
        <div className="overflow-x-auto overflow-y-hidden scrollbar-thin">
          <div className="relative min-w-[min(100%,640px)] sm:min-w-0 w-full aspect-[800/520] sm:aspect-[16/10]">
            {useBuiltInFloor ? (
              <HospitalFloorPlan className="absolute inset-0 w-full h-full text-foreground" />
            ) : (
              <img
                src={config.background_image}
                alt="Hospital floor plan"
                className="absolute inset-0 w-full h-full object-contain"
              />
            )}

            {config.nodes.map((n) => {
              const status = completed[n.id]
              const isActive = activeNode === n.id
              return (
                <div
                  key={n.id}
                  className="absolute -translate-x-1/2 -translate-y-full"
                  style={{ left: `${n.x_percent}%`, top: `${n.y_percent}%` }}
                >
                  {/* Zone label */}
                  <span
                    className={cn(
                      'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold shadow-sm',
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border'
                    )}
                  >
                    {n.label}
                  </span>
                  <button
                    type="button"
                    className={cn(
                      'relative flex min-h-[52px] min-w-[52px] items-center justify-center rounded-full shadow-lg ring-4 ring-background transition-transform',
                      'hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      status === 'correct' && 'bg-emerald-500 text-white animate-none',
                      status === 'wrong' && 'bg-destructive text-white',
                      !status && 'bg-amber-500 text-white animate-pulse',
                      isActive && !status && 'ring-primary scale-110'
                    )}
                    onClick={() => {
                      setActiveNode(n.id)
                      setSelected(null)
                    }}
                    aria-label={`Investigate incident at ${n.label}`}
                  >
                    {status === 'correct' ? (
                      <Check className="h-6 w-6" />
                    ) : status === 'wrong' ? (
                      <X className="h-6 w-6" />
                    ) : (
                      <AlertCircle className="h-6 w-6" />
                    )}
                  </button>
                  <MapPin
                    className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 h-3 w-3 text-amber-600 drop-shadow"
                    fill="currentColor"
                    aria-hidden
                  />
                </div>
              )
            })}
          </div>
        </div>
        {useBuiltInFloor && (
          <p className="text-xs text-muted-foreground px-3 py-2 border-t bg-card/50 sm:hidden">
            Swipe sideways to explore the full floor plan
          </p>
        )}
      </div>

      <AnimatePresence>
        {node && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              aria-label="Close panel"
              onClick={() => setActiveNode(null)}
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className={cn(
                'z-50 overflow-y-auto bg-card shadow-xl',
                'fixed inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t p-4 pb-6 safe-area-pb',
                'lg:relative lg:inset-auto lg:max-h-none lg:rounded-xl lg:border lg:p-6 lg:shadow-md'
              )}
            >
              <div className="lg:hidden w-10 h-1 rounded-full bg-muted mx-auto mb-4" aria-hidden />
              <div className="flex items-start gap-2 mb-3">
                <div className="rounded-lg bg-amber-500/15 p-2 text-amber-600 shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{node.label}</h3>
                  <p className="text-xs text-muted-foreground">Incident scenario</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-4 rounded-lg bg-muted/50 p-3 border-l-4 border-amber-500">
                {node.scenario}
              </p>
              <p className="font-medium mb-3">{node.question.text}</p>
              <div className="space-y-2 mb-4">
                {node.question.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelected(opt.id)}
                    className={cn(
                      'w-full text-left rounded-lg border px-4 py-3 text-sm min-h-[48px] transition-colors',
                      selected === opt.id && 'border-primary bg-primary/10 ring-1 ring-primary'
                    )}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
              {completed[node.id] === 'wrong' && (
                <p className="text-sm text-destructive mb-3">Incorrect — review the scenario and try again.</p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={submitAnswer} disabled={!selected} className="min-h-12 flex-1">
                  Submit classification
                </Button>
                <Button variant="outline" onClick={() => setActiveNode(null)} className="min-h-12 flex-1">
                  Back to map
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {!activeNode && (
        <p className="text-center text-xs text-muted-foreground">
          Tap each pulsing alert on the map to read the scenario and classify the incident type.
        </p>
      )}
    </div>
  )
}
