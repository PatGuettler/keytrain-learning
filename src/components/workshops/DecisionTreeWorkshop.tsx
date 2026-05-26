import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WorkshopContent, DecisionTreeConfig } from '@/types/workshop.types'

const defaultConfig: DecisionTreeConfig = {
  start_node_id: 'start',
  nodes: {
    start: {
      id: 'start',
      title: 'Patient Complaint of Chest Pain',
      description: 'A patient arrives at the ED reporting chest pain. What is your first action?',
      choices: [
        { id: 'c1', label: 'Begin immediate triage assessment', next_node_id: 'good1' },
        { id: 'c2', label: 'Ask them to wait in the waiting room', next_node_id: 'bad1' },
        { id: 'c3', label: 'Document and defer to next shift', next_node_id: 'bad2' },
      ],
    },
    good1: {
      id: 'good1',
      title: 'Correct — Immediate Triage',
      description: 'You activated the chest pain protocol. The patient receives timely ECG and labs.',
      outcome: 'good',
    },
    bad1: {
      id: 'bad1',
      title: 'Delayed Care Risk',
      description: 'Chest pain patients require immediate assessment. Delay increases adverse event risk.',
      outcome: 'bad',
      teachable_moment: 'Always prioritize chest pain per facility protocol — never routine waiting room placement without triage.',
    },
    bad2: {
      id: 'bad2',
      title: 'Handoff Without Assessment',
      description: 'Deferring unassessed chest pain violates standard of care and incident reporting requirements.',
      outcome: 'bad',
      teachable_moment: 'Any acute symptom must be assessed before shift handoff. Document and escalate if unsure.',
    },
  },
}

export function DecisionTreeWorkshop({
  content,
  onComplete,
}: {
  content: WorkshopContent
  onComplete: () => void
}) {
  const config = (content.config as DecisionTreeConfig)?.nodes
    ? (content.config as DecisionTreeConfig)
    : defaultConfig
  const [nodeId, setNodeId] = useState(config.start_node_id)
  const node = config.nodes[nodeId]

  if (!node) return null

  const isEnd = Boolean(node.outcome)

  return (
    <motion.div
      key={nodeId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <p className="text-muted-foreground">{content.instructions}</p>
      <div className="rounded-lg border p-6">
        <h3 className="text-xl font-bold mb-2">{node.title}</h3>
        <p className="text-muted-foreground">{node.description}</p>
        {node.teachable_moment && (
          <p className="mt-4 text-sm border-l-4 border-amber-500 pl-3">{node.teachable_moment}</p>
        )}
        {isEnd && (
          <p
            className={cn(
              'mt-4 font-semibold',
              node.outcome === 'good' ? 'text-emerald-600' : 'text-destructive'
            )}
          >
            {node.outcome === 'good' ? 'Good outcome!' : 'Learn from this path'}
          </p>
        )}
      </div>
      {node.choices ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {node.choices.map((c) => (
            <Button key={c.id} variant="outline" onClick={() => setNodeId(c.next_node_id)}>
              {c.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button onClick={() => setNodeId(config.start_node_id)}>Try Another Path</Button>
          <Button onClick={onComplete}>Complete Workshop</Button>
        </div>
      )}
    </motion.div>
  )
}
