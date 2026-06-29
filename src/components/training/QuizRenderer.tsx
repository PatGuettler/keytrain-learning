import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QuizContent } from '@/types/course.types'
import type { ModuleCompletePayload } from '@/types/training.types'

function isQuestionAnswered(
  q: QuizContent['questions'][number],
  answers: Record<string, string | string[]>
): boolean {
  const a = answers[q.id]
  if (q.type === 'multi_select') return Array.isArray(a) && a.length > 0
  return typeof a === 'string' && a.length > 0
}

function scoreQuiz(
  questions: QuizContent['questions'],
  answers: Record<string, string | string[]>
) {
  let correct = 0
  const wrongQuestions: { id: string; text: string }[] = []

  questions.forEach((q) => {
    const selected = answers[q.id]
    const correctIds = q.options.filter((o) => o.correct).map((o) => o.id)
    let isCorrect = false
    if (q.type === 'single_select') {
      isCorrect = correctIds.includes(selected as string)
    } else {
      const sel = (selected as string[]) ?? []
      isCorrect = correctIds.length === sel.length && correctIds.every((id) => sel.includes(id))
    }
    if (isCorrect) correct++
    else wrongQuestions.push({ id: q.id, text: q.text })
  })

  return {
    score: Math.round((correct / questions.length) * 100),
    wrongQuestions,
  }
}

export function QuizRenderer({
  content,
  onComplete,
}: {
  content: QuizContent
  onComplete: (payload: ModuleCompletePayload) => void
}) {
  const questions = useMemo(() => {
    const q = [...content.questions]
    if (content.randomize_questions) return q.sort(() => Math.random() - 0.5)
    return q
  }, [content])

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)

  const currentQuestion = questions[questionIndex]
  const allAnswered = questions.every((q) => isQuestionAnswered(q, answers))
  const currentAnswered = currentQuestion ? isQuestionAnswered(currentQuestion, answers) : false
  const isLastQuestion = questionIndex >= questions.length - 1

  const handleSubmit = () => {
    const { score, wrongQuestions } = scoreQuiz(questions, answers)
    const passed = score >= content.passing_score
    setSubmitted(true)
    setResult({ score, passed })
    onComplete({
      score,
      passed,
      interactions: {
        type: 'quiz',
        passed,
        wrong_questions: wrongQuestions,
        answers,
      },
    })
  }

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">This quiz has no questions yet.</p>
  }

  if (submitted && result) {
    return (
      <div className="space-y-4 min-w-0">
        <div
          className={cn(
            'rounded-xl border p-5 text-center space-y-2',
            result.passed
              ? 'border-emerald-600/50 bg-emerald-500/10 dark:bg-emerald-950/40'
              : 'border-amber-600/50 bg-amber-500/10 dark:bg-amber-950/40'
          )}
        >
          <p className="text-3xl font-bold tabular-nums">{result.score}%</p>
          <p className="font-semibold">
            {result.passed ? 'Passed' : 'Did not pass'} — need {content.passing_score}% to pass
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {result.passed
            ? 'Use Next module below to continue.'
            : 'Your answers are final for this attempt. Use Next module below to continue the exam.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 min-w-0 w-full max-w-full">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">
          Question {questionIndex + 1} of {questions.length}
        </span>
        <span className="text-muted-foreground">Pass: {content.passing_score}%</span>
      </div>

      {currentQuestion && (
        <div className="space-y-3">
          <p className="text-base sm:text-lg font-medium leading-snug break-anywhere">
            {currentQuestion.text}
          </p>
          {currentQuestion.type === 'multi_select' && (
            <p className="text-sm text-muted-foreground">Select all that apply.</p>
          )}

          <div className="space-y-2">
            {currentQuestion.options.map((opt) => {
              const selected =
                currentQuestion.type === 'multi_select'
                  ? ((answers[currentQuestion.id] as string[] | undefined) ?? []).includes(opt.id)
                  : answers[currentQuestion.id] === opt.id

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (currentQuestion.type === 'multi_select') {
                      setAnswers((a) => {
                        const cur = (a[currentQuestion.id] as string[] | undefined) ?? []
                        const next = cur.includes(opt.id)
                          ? cur.filter((id) => id !== opt.id)
                          : [...cur, opt.id]
                        return { ...a, [currentQuestion.id]: next }
                      })
                    } else {
                      setAnswers((a) => ({ ...a, [currentQuestion.id]: opt.id }))
                    }
                  }}
                  className={cn(
                    'w-full text-left rounded-xl border px-4 py-3.5 text-sm min-h-[52px] transition-colors',
                    'active:scale-[0.99] active:bg-accent/50',
                    selected && 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  )}
                >
                  {opt.text}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="flex-1 min-h-12"
          disabled={questionIndex === 0}
          onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className="sr-only sm:not-sr-only">Previous</span>
        </Button>

        {isLastQuestion ? (
          <Button
            type="button"
            className="flex-[2] min-h-12"
            disabled={!allAnswered}
            onClick={handleSubmit}
          >
            Submit answers
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-[2] min-h-12"
            disabled={!currentAnswered}
            onClick={() => setQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Button>
        )}
      </div>
    </div>
  )
}
