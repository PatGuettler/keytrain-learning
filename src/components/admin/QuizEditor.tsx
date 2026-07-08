import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { newQuestionId } from '@/lib/module-defaults'
import type { QuizContent, QuizQuestion } from '@/types/course.types'

const textareaClass =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function QuizEditor({
  content,
  onChange,
}: {
  content: QuizContent
  onChange: (content: QuizContent) => void
}) {
  const questions = content.questions ?? []

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    onChange({
      ...content,
      questions: questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    })
  }

  const addQuestion = () => {
    onChange({
      ...content,
      questions: [
        ...questions,
        {
          id: newQuestionId(),
          text: 'New question',
          type: 'single_select',
          options: [
            { id: 'a', text: 'Option A', correct: true },
            { id: 'b', text: 'Option B', correct: false },
          ],
          explanation: '',
        },
      ],
    })
  }

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return
    onChange({ ...content, questions: questions.filter((_, i) => i !== index) })
  }

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= questions.length) return
    const next = [...questions]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange({ ...content, questions: next })
  }

  const setCorrectOption = (questionIndex: number, optionId: string) => {
    const q = questions[questionIndex]
    if (!q) return
    updateQuestion(questionIndex, {
      options: q.options.map((o) => ({ ...o, correct: o.id === optionId })),
    })
  }

  const toggleCorrectOption = (questionIndex: number, optionId: string) => {
    const q = questions[questionIndex]
    if (!q) return
    updateQuestion(questionIndex, {
      options: q.options.map((o) =>
        o.id === optionId ? { ...o, correct: !o.correct } : o
      ),
    })
  }

  const changeQuestionType = (
    questionIndex: number,
    type: QuizQuestion['type']
  ) => {
    const q = questions[questionIndex]
    if (!q) return
    let options = q.options
    if (type === 'single_select') {
      const firstCorrect = options.find((o) => o.correct) ?? options[0]
      options = options.map((o) => ({
        ...o,
        correct: firstCorrect ? o.id === firstCorrect.id : false,
      }))
    }
    updateQuestion(questionIndex, { type, options })
  }

  const updateOption = (questionIndex: number, optionIndex: number, text: string) => {
    const q = questions[questionIndex]
    if (!q) return
    updateQuestion(questionIndex, {
      options: q.options.map((o, i) => (i === optionIndex ? { ...o, text } : o)),
    })
  }

  const addOption = (questionIndex: number) => {
    const q = questions[questionIndex]
    if (!q) return
    const nextId = String.fromCharCode(97 + q.options.length)
    updateQuestion(questionIndex, {
      options: [...q.options, { id: nextId, text: `Option ${nextId.toUpperCase()}`, correct: false }],
    })
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const q = questions[questionIndex]
    if (!q || q.options.length <= 2) return
    const removed = q.options[optionIndex]
    const nextOptions = q.options.filter((_, i) => i !== optionIndex)
    if (
      q.type === 'single_select' &&
      removed.correct &&
      nextOptions.length > 0 &&
      !nextOptions.some((o) => o.correct)
    ) {
      nextOptions[0].correct = true
    }
    updateQuestion(questionIndex, { options: nextOptions })
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
            value={content.passing_score ?? 80}
            onChange={(e) =>
              onChange({ ...content, passing_score: parseInt(e.target.value, 10) || 80 })
            }
          />
        </div>
        <label className="flex items-end gap-2 text-sm pb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(content.randomize_questions)}
            onChange={(e) => onChange({ ...content, randomize_questions: e.target.checked })}
            className="rounded border-input"
          />
          Randomize question order
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Questions ({questions.length})</p>
        <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
          <Plus className="h-3 w-3 mr-1" /> Add question
        </Button>
      </div>

      {questions.map((question, qIndex) => (
        <div key={question.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">Question {qIndex + 1}</p>
            <div className="flex gap-1 shrink-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={qIndex === 0}
                onClick={() => moveQuestion(qIndex, -1)}
                aria-label="Move question up"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={qIndex === questions.length - 1}
                onClick={() => moveQuestion(qIndex, 1)}
                aria-label="Move question down"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                disabled={questions.length <= 1}
                onClick={() => removeQuestion(qIndex)}
                aria-label="Remove question"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Question text</Label>
            <textarea
              className={textareaClass}
              value={question.text}
              onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Answer type</Label>
            <select
              className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={question.type}
              onChange={(e) =>
                changeQuestionType(qIndex, e.target.value as QuizQuestion['type'])
              }
            >
              <option value="single_select">Single select (one correct)</option>
              <option value="multi_select">Multi select (select all that apply)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>
              {question.type === 'multi_select'
                ? 'Answer options (check all correct answers)'
                : 'Answer options (select the correct one)'}
            </Label>
            {question.options.map((option, oIndex) => (
              <div key={option.id} className="flex items-center gap-2">
                <input
                  type={question.type === 'multi_select' ? 'checkbox' : 'radio'}
                  name={`correct-${question.id}`}
                  checked={option.correct}
                  onChange={() =>
                    question.type === 'multi_select'
                      ? toggleCorrectOption(qIndex, option.id)
                      : setCorrectOption(qIndex, option.id)
                  }
                />
                <Input
                  value={option.text}
                  onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  disabled={question.options.length <= 2}
                  onClick={() => removeOption(qIndex, oIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => addOption(qIndex)}>
              <Plus className="h-3 w-3 mr-1" /> Add option
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Explanation (shown after submit)</Label>
            <textarea
              className={textareaClass}
              value={question.explanation ?? ''}
              onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
