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
            {q.type === 'multi_select' && (
              <span className="block text-sm font-normal text-muted-foreground mt-1">
                Select all that apply.
              </span>
            )}
          </p>
          <div className="space-y-2">
            {q.options.map((opt) => {
              const selected =
                q.type === 'multi_select'
                  ? ((answers[q.id] as string[] | undefined) ?? []).includes(opt.id)
                  : answers[q.id] === opt.id
              const showResult = submitted
              const isCorrect = opt.correct
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={submitted}
                  onClick={() => {
                    if (q.type === 'multi_select') {
                      setAnswers((a) => {
                        const cur = (a[q.id] as string[] | undefined) ?? []
                        const next = cur.includes(opt.id)
                          ? cur.filter((id) => id !== opt.id)
                          : [...cur, opt.id]
                        return { ...a, [q.id]: next }
                      })
                    } else {
                      setAnswers((a) => ({ ...a, [q.id]: opt.id }))
                    }
                  }}
                  className={cn(
                    'w-full text-left rounded-lg border px-4 py-3 text-sm min-h-[48px] transition-colors text-foreground',
                    'active:bg-accent/50',
                    !submitted && selected && 'border-primary bg-primary/10',
                    showResult &&
                      isCorrect &&
                      'border-emerald-600 bg-emerald-500/15 dark:border-emerald-500 dark:bg-emerald-950/50',
                    showResult &&
                      selected &&
                      !isCorrect &&
                      'border-destructive bg-destructive/15 dark:bg-destructive/25'
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
        <Button
          onClick={handleSubmit}
          disabled={
            !questions.every((q) => {
              const a = answers[q.id]
              if (q.type === 'multi_select') return Array.isArray(a) && a.length > 0
              return typeof a === 'string' && a.length > 0
            })
          }
        >
          Submit Quiz
        </Button>
      ) : (
        <div
          className={cn(
            'rounded-lg border p-4',
            score >= content.passing_score
              ? 'border-emerald-600/50 bg-emerald-500/10 dark:bg-emerald-950/40'
              : 'border-amber-600/50 bg-amber-500/10 dark:bg-amber-950/40'
          )}
        >
          <p className="font-semibold text-foreground">
            Score: {score}% — {score >= content.passing_score ? 'Passed' : 'Did not pass'}
          </p>
        </div>
      )}
    </div>
  )
}
