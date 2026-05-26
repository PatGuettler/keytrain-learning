import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Check, Lightbulb, MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { HospitalFloorPlan } from './HospitalFloorPlan'
import type { ModuleCompletePayload } from '@/types/training.types'
import type { WorkshopContent, NodeMapConfig } from '@/types/workshop.types'

export function NodeMapWorkshop({
  content,
  onComplete,
}: {
  content: WorkshopContent
  onComplete: (result: ModuleCompletePayload) => void
}) {
  const config = content.config as NodeMapConfig
  const passingScore = config.passing_score ?? 60
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [completed, setCompleted] = useState<Record<string, 'correct' | 'wrong'>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

  const node = config.nodes.find((n) => n.id === activeNode)
  const useBuiltInFloor = !config.background_image?.trim()

  const { correctCount, attemptedCount, score, passed, allAttempted } = useMemo(() => {
    const correct = config.nodes.filter((n) => completed[n.id] === 'correct').length
    const attempted = config.nodes.filter((n) => completed[n.id] !== undefined).length
    const pct = config.nodes.length
      ? Math.round((correct / config.nodes.length) * 100)
      : 0
    return {
      correctCount: correct,
      attemptedCount: attempted,
      score: pct,
      passed: pct >= passingScore,
      allAttempted: config.nodes.every((n) => completed[n.id] !== undefined),
    }
  }, [completed, config.nodes, passingScore])

  const submitAnswer = () => {
    if (!node || !selected) return
    const correct = selected === node.question.correct_id
    setCompleted((c) => ({ ...c, [node.id]: correct ? 'correct' : 'wrong' }))
    setSelected(null)
    if (correct) setActiveNode(null)
  }

  const finishAndSave = () => {
    onComplete({
      score,
      passed,
      interactions: {
        type: 'node_map',
        results: completed,
        correct_count: correctCount,
        attempted_count: attemptedCount,
        completed_at: new Date().toISOString(),
      },
    })
  }

  const correctLabel = (nodeId: string) => {
    const n = config.nodes.find((x) => x.id === nodeId)
    if (!n) return ''
    return n.question.options.find((o) => o.id === n.question.correct_id)?.text ?? ''
  }

  if (showResults) {
    const wrongNodes = config.nodes.filter((n) => completed[n.id] === 'wrong')
    return (
      <div className="space-y-4">
        <Card className={cn('border-2', passed ? 'border-emerald-500/50' : 'border-amber-500/50')}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">Floor map results</CardTitle>
              <Badge variant={passed ? 'success' : 'warning'}>
                {score}% — {passed ? 'Passed' : 'Review recommended'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>{correctCount}</strong> of <strong>{config.nodes.length}</strong> incidents
              classified correctly. Your score is saved to your training record.
            </p>
            {!passed && (
              <p className="text-muted-foreground">
                Passing score is {passingScore}%. You can continue to the next activity when ready.
              </p>
            )}
          </CardContent>
        </Card>

        {wrongNodes.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Review missed locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {wrongNodes.map((n) => (
                <div key={n.id} className="rounded-lg border bg-card p-3 text-sm space-y-1">
                  <p className="font-medium">{n.label}</p>
                  <p className="text-muted-foreground">{n.scenario}</p>
                  <p className="text-emerald-700 dark:text-emerald-400">
                    Correct: {correctLabel(n.id)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="min-h-12 flex-1"
            onClick={() => setShowResults(false)}
          >
            Back to map
          </Button>
          <Button className="min-h-12 flex-1" onClick={finishAndSave}>
            Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-foreground">{content.instructions}</p>
        <Badge variant="secondary" className="w-fit shrink-0">
          {correctCount} correct · {attemptedCount}/{config.nodes.length} reviewed
        </Badge>
      </div>

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
                {node.question.options.map((opt) => {
                  const isCorrectOpt = opt.id === node.question.correct_id
                  const showFeedback = completed[node.id] !== undefined
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={showFeedback && completed[node.id] === 'correct'}
                      onClick={() => setSelected(opt.id)}
                      className={cn(
                        'w-full text-left rounded-lg border px-4 py-3 text-sm min-h-[48px] transition-colors text-foreground',
                        selected === opt.id && !showFeedback && 'border-primary bg-primary/10 ring-1 ring-primary',
                        showFeedback &&
                          isCorrectOpt &&
                          'border-emerald-600 bg-emerald-500/15 dark:bg-emerald-950/50',
                        showFeedback &&
                          completed[node.id] === 'wrong' &&
                          selected === opt.id &&
                          !isCorrectOpt &&
                          'border-destructive bg-destructive/15'
                      )}
                    >
                      {opt.text}
                    </button>
                  )
                })}
              </div>
              {completed[node.id] === 'wrong' && (
                <p className="text-sm text-muted-foreground mb-3 border-l-2 border-amber-500 pl-3">
                  Correct classification: <strong>{correctLabel(node.id)}</strong>. You can retry
                  or return to the map.
                </p>
              )}
              {completed[node.id] === 'correct' && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-3">Correct!</p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                {completed[node.id] === undefined && (
                  <Button onClick={submitAnswer} disabled={!selected} className="min-h-12 flex-1">
                    Submit classification
                  </Button>
                )}
                {completed[node.id] === 'wrong' && (
                  <Button
                    onClick={() => {
                      setCompleted((c) => {
                        const next = { ...c }
                        delete next[node.id]
                        return next
                      })
                      setSelected(null)
                    }}
                    variant="outline"
                    className="min-h-12 flex-1"
                  >
                    Try again
                  </Button>
                )}
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

      {allAttempted && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <p className="text-sm">
            You&apos;ve reviewed all locations ({correctCount}/{config.nodes.length} correct). View
            your results and continue — your score will be saved.
          </p>
          <Button className="min-h-12 w-full sm:w-auto" onClick={() => setShowResults(true)}>
            View results &amp; continue
          </Button>
        </div>
      )}
    </div>
  )
}
