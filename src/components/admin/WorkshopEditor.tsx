import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { defaultWorkshopContent, newNodeId } from '@/lib/module-defaults'
import type {
  NodeMapConfig,
  SortingConfig,
  WorkshopContent,
  WorkshopType,
} from '@/types/workshop.types'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const textareaClass =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const WORKSHOP_TYPES: { value: WorkshopType; label: string }[] = [
  { value: 'node_map', label: 'Floor plan / node map' },
  { value: 'sorting', label: 'Sorting cards' },
  { value: 'decision_tree', label: 'Decision tree' },
  { value: 'hotspot', label: 'Hotspot' },
]

function NodeMapEditor({
  config,
  onChange,
}: {
  config: NodeMapConfig
  onChange: (config: NodeMapConfig) => void
}) {
  const nodes = config.nodes ?? []

  const updateNode = (index: number, patch: Partial<(typeof nodes)[0]>) => {
    onChange({
      ...config,
      nodes: nodes.map((node, i) => (i === index ? { ...node, ...patch } : node)),
    })
  }

  const updateNodeQuestion = (
    index: number,
    patch: Partial<(typeof nodes)[0]['question']>
  ) => {
    const node = nodes[index]
    if (!node) return
    updateNode(index, { question: { ...node.question, ...patch } })
  }

  const addNode = () => {
    onChange({
      ...config,
      nodes: [
        ...nodes,
        {
          id: newNodeId(),
          x_percent: 50,
          y_percent: 50,
          icon: 'alert',
          label: 'New location',
          scenario: '',
          question: {
            text: 'What type of incident is this?',
            options: [
              { id: 'a', text: 'Clinical' },
              { id: 'b', text: 'Cybersecurity' },
              { id: 'c', text: 'Physical' },
            ],
            correct_id: 'a',
          },
        },
      ],
    })
  }

  const removeNode = (index: number) => {
    if (nodes.length <= 1) return
    onChange({ ...config, nodes: nodes.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Passing score (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={config.passing_score ?? 60}
            onChange={(e) =>
              onChange({ ...config, passing_score: parseInt(e.target.value, 10) || 60 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Background image URL (optional)</Label>
          <Input
            value={config.background_image ?? ''}
            onChange={(e) => onChange({ ...config, background_image: e.target.value })}
            placeholder="Leave blank for built-in hospital floor plan"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Hotspot nodes ({nodes.length})</p>
        <Button type="button" size="sm" variant="outline" onClick={addNode}>
          <Plus className="h-3 w-3 mr-1" /> Add node
        </Button>
      </div>

      {nodes.map((node, index) => (
        <div key={node.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">Node {index + 1}: {node.label || 'Untitled'}</p>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              disabled={nodes.length <= 1}
              onClick={() => removeNode(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={node.label}
                onChange={(e) => updateNode(index, { label: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>X (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={node.x_percent}
                  onChange={(e) =>
                    updateNode(index, { x_percent: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Y (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={node.y_percent}
                  onChange={(e) =>
                    updateNode(index, { y_percent: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Scenario</Label>
            <textarea
              className={textareaClass}
              value={node.scenario}
              onChange={(e) => updateNode(index, { scenario: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              value={node.question.text}
              onChange={(e) => updateNodeQuestion(index, { text: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Answer options</Label>
            {node.question.options.map((option, oIndex) => (
              <div key={option.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`node-correct-${node.id}`}
                  checked={node.question.correct_id === option.id}
                  onChange={() => updateNodeQuestion(index, { correct_id: option.id })}
                />
                <Input
                  value={option.text}
                  onChange={(e) => {
                    const nextOptions = node.question.options.map((o, i) =>
                      i === oIndex ? { ...o, text: e.target.value } : o
                    )
                    updateNodeQuestion(index, { options: nextOptions })
                  }}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SortingEditor({
  config,
  onChange,
}: {
  config: SortingConfig
  onChange: (config: SortingConfig) => void
}) {
  const categories = config.categories ?? []
  const cards = config.cards ?? []

  const addCategory = () => {
    const id = `cat_${Date.now()}`
    onChange({
      ...config,
      categories: [...categories, { id, label: 'New category' }],
    })
  }

  const addCard = () => {
    const id = `card_${Date.now()}`
    onChange({
      ...config,
      cards: [
        ...cards,
        { id, text: 'New incident card', category_id: categories[0]?.id ?? 'clinical' },
      ],
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Passing score (%)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={config.passing_score ?? 80}
          className="max-w-xs"
          onChange={(e) =>
            onChange({ ...config, passing_score: parseInt(e.target.value, 10) || 80 })
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Categories</Label>
          <Button type="button" size="sm" variant="outline" onClick={addCategory}>
            <Plus className="h-3 w-3 mr-1" /> Add category
          </Button>
        </div>
        {categories.map((category, index) => (
          <div key={category.id} className="flex gap-2">
            <Input
              value={category.label}
              onChange={(e) =>
                onChange({
                  ...config,
                  categories: categories.map((c, i) =>
                    i === index ? { ...c, label: e.target.value } : c
                  ),
                })
              }
              className="flex-1"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10 text-destructive shrink-0"
              disabled={categories.length <= 1}
              onClick={() =>
                onChange({
                  ...config,
                  categories: categories.filter((_, i) => i !== index),
                  cards: cards.filter((card) => card.category_id !== category.id),
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Incident cards</Label>
          <Button type="button" size="sm" variant="outline" onClick={addCard} disabled={categories.length === 0}>
            <Plus className="h-3 w-3 mr-1" /> Add card
          </Button>
        </div>
        {cards.map((card, index) => (
          <div key={card.id} className="grid gap-2 sm:grid-cols-[1fr_180px_auto] items-center">
            <Input
              value={card.text}
              onChange={(e) =>
                onChange({
                  ...config,
                  cards: cards.map((c, i) => (i === index ? { ...c, text: e.target.value } : c)),
                })
              }
            />
            <select
              className={selectClass}
              value={card.category_id}
              onChange={(e) =>
                onChange({
                  ...config,
                  cards: cards.map((c, i) =>
                    i === index ? { ...c, category_id: e.target.value } : c
                  ),
                })
              }
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10 text-destructive"
              onClick={() =>
                onChange({ ...config, cards: cards.filter((_, i) => i !== index) })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function WorkshopEditor({
  content,
  onChange,
}: {
  content: WorkshopContent
  onChange: (content: WorkshopContent) => void
}) {
  const changeType = (workshop_type: WorkshopType) => {
    const next = defaultWorkshopContent(workshop_type)
    onChange({
      ...next,
      title: content.title || next.title,
      instructions: content.instructions || next.instructions,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Workshop type</Label>
          <select
            className={selectClass}
            value={content.workshop_type}
            onChange={(e) => changeType(e.target.value as WorkshopType)}
          >
            {WORKSHOP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Display title</Label>
          <Input
            value={content.title}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Instructions for learners</Label>
        <textarea
          className={textareaClass}
          value={content.instructions}
          onChange={(e) => onChange({ ...content, instructions: e.target.value })}
        />
      </div>

      {content.workshop_type === 'node_map' && (
        <NodeMapEditor
          config={content.config as NodeMapConfig}
          onChange={(config) => onChange({ ...content, config })}
        />
      )}

      {content.workshop_type === 'sorting' && (
        <SortingEditor
          config={content.config as SortingConfig}
          onChange={(config) => onChange({ ...content, config })}
        />
      )}

      {(content.workshop_type === 'decision_tree' || content.workshop_type === 'hotspot') && (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
          Advanced {content.workshop_type.replace('_', ' ')} editing uses structured JSON in the
          database. Use node map or sorting workshops to build courses like Incident Awareness, or
          import the example template below.
        </p>
      )}
    </div>
  )
}
