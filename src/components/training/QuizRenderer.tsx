import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QuizContent } from '@/types/course.types'

export function QuizRenderer({
  content,
  onComplete,
}: {
  content: QuizContent
  onComplete: (score: number, passed: boolean) => void
}) {
  const questions = useMemo(() => {
    const q = [...content.questions]
    if (content.randomize_questions) return q.sort(() => Math.random() - 0.5)
    return q
  }, [content])

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitted, setSubmitted] = useState(false)

  const score = useMemo(() => {
    if (!submitted) return 0
    let correct = 0
    questions.forEach((q) => {
      const selected = answers[q.id]
      const correctIds = q.options.filter((o) => o.correct).map((o) => o.id)
      if (q.type === 'single_select') {
        if (correctIds.includes(selected as string)) correct++
      } else {
        const sel = (selected as string[]) ?? []
        if (correctIds.length === sel.length && correctIds.every((id) => sel.includes(id))) correct++
      }
    })
    return Math.round((correct / questions.length) * 100)
  }, [submitted, answers, questions])

  const handleSubmit = () => {
    let correct = 0
    questions.forEach((q) => {
      const selected = answers[q.id]
      const correctIds = q.options.filter((o) => o.correct).map((o) => o.id)
      if (q.type === 'single_select') {
        if (correctIds.includes(selected as string)) correct++
      } else {
        const sel = (selected as string[]) ?? []
        if (correctIds.length === sel.length && correctIds.every((id) => sel.includes(id))) correct++
      }
    })
    const finalScore = Math.round((correct / questions.length) * 100)
    setSubmitted(true)
    onComplete(finalScore, finalScore >= content.passing_score)
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">Passing score: {content.passing_score}%</p>
      {questions.map((q, qi) => (
        <div key={q.id} className="space-y-3 rounded-lg border p-4">
          <p className="font-medium">
            {qi + 1}. {q.text}
          </p>
          <div className="space-y-2">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.id
              const showResult = submitted
              const isCorrect = opt.correct
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={submitted}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                  className={cn(
                    'w-full text-left rounded-lg border px-4 py-3 text-sm min-h-[48px] transition-colors active:bg-accent/50',
                    selected && 'border-primary bg-primary/5',
                    showResult && isCorrect && 'border-emerald-500 bg-emerald-50',
                    showResult && selected && !isCorrect && 'border-destructive bg-destructive/5'
                  )}
                >
                  {opt.text}
                </button>
              )
            })}
          </div>
          {submitted && q.explanation && (
            <p className="text-sm text-muted-foreground border-l-2 pl-3">{q.explanation}</p>
          )}
        </div>
      ))}
      {!submitted ? (
        <Button onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length}>
          Submit Quiz
        </Button>
      ) : (
        <div className="rounded-lg bg-accent p-4">
          <p className="font-semibold">
            Score: {score}% — {score >= content.passing_score ? 'Passed' : 'Did not pass'}
          </p>
        </div>
      )}
    </div>
  )
}
