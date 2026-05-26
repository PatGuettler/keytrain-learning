import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
  const allDone = config.nodes.every((n) => completed[n.id] === 'correct')

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
        <p className="text-emerald-700 font-semibold">All nodes completed!</p>
        <Button onClick={onComplete}>Continue</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">{content.instructions}</p>
      <div className="relative aspect-video rounded-lg border bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 overflow-hidden">
        {config.background_image ? (
          <img src={config.background_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Hospital floor plan
          </div>
        )}
        {config.nodes.map((n) => {
          const status = completed[n.id]
          return (
            <button
              key={n.id}
              type="button"
              style={{ left: `${n.x_percent}%`, top: `${n.y_percent}%` }}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110',
                status === 'correct' && 'bg-emerald-500 text-white',
                status === 'wrong' && 'bg-destructive text-white',
                !status && 'bg-amber-500 text-white animate-pulse'
              )}
              onClick={() => setActiveNode(n.id)}
              aria-label={n.label}
            >
              {status === 'correct' ? <Check className="h-5 w-5" /> : status === 'wrong' ? <X className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {node && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l shadow-xl p-6 z-40 overflow-y-auto lg:relative lg:shadow-none lg:border lg:rounded-lg"
          >
            <h3 className="font-bold text-lg mb-2">{node.label}</h3>
            <p className="text-sm text-muted-foreground mb-4">{node.scenario}</p>
            <p className="font-medium mb-3">{node.question.text}</p>
            <div className="space-y-2 mb-4">
              {node.question.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelected(opt.id)}
                  className={cn(
                    'w-full text-left rounded border px-3 py-2 text-sm',
                    selected === opt.id && 'border-primary bg-primary/5'
                  )}
                >
                  {opt.text}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={submitAnswer} disabled={!selected}>
                Submit
              </Button>
              <Button variant="outline" onClick={() => setActiveNode(null)}>
                Close
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
