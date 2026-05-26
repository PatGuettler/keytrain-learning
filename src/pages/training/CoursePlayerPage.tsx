import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CourseViewer } from '@/components/training/CourseViewer'
import { useCourse, useModules } from '@/hooks/useCourses'
import { useAssignments } from '@/hooks/useAssignments'
import { useTrainingSession } from '@/hooks/useTrainingSession'
import { useAuthStore } from '@/store/authStore'
import { updateAssignment } from '@/services/assignments.service'
import { saveModuleAttempt } from '@/services/sessions.service'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ModuleCompletePayload } from '@/types/training.types'

interface ModuleScoreRecord {
  moduleId: string
  title: string
  score: number
  passed: boolean
}

export function CoursePlayerPage({ dashboardPath }: { dashboardPath: string }) {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.userId)!
  const { data: course } = useCourse(courseId!)
  const { data: modules = [], isLoading } = useModules(courseId!)
  const { data: assignments = [] } = useAssignments(userId)
  const assignment = assignments.find((a) => a.course_id === courseId)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set())
  const [moduleReady, setModuleReady] = useState(false)
  const [finished, setFinished] = useState(false)
  const [courseScore, setCourseScore] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const moduleScoresRef = useRef<ModuleScoreRecord[]>([])

  const { session, finish } = useTrainingSession(
    assignment?.id ?? 'demo',
    userId,
    courseId!,
    Boolean(userId && courseId)
  )

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const handleModuleComplete = useCallback(
    async (payload: ModuleCompletePayload) => {
      const mod = modules[currentIndex]
      if (!mod) return

      setCompletedIndices((prev) => new Set(prev).add(currentIndex))
      moduleScoresRef.current = [
        ...moduleScoresRef.current.filter((m) => m.moduleId !== mod.id),
        { moduleId: mod.id, title: mod.title, score: payload.score, passed: payload.passed },
      ]

      if (session?.id) {
        await saveModuleAttempt({
          session_id: session.id,
          module_id: mod.id,
          user_id: userId,
          score: payload.score,
          completed_at: new Date().toISOString(),
          time_spent_seconds: 0,
          interactions: payload.interactions ?? { passed: payload.passed },
        })
      }

      if (mod.type === 'quiz' && !payload.passed) {
        setModuleReady(false)
      } else {
        setModuleReady(true)
      }
    },
    [currentIndex, modules, session?.id, userId]
  )

  const canNext = moduleReady || completedIndices.has(currentIndex)
  const isLast = currentIndex >= modules.length - 1

  const handleReviewLesson = (moduleIndex: number) => {
    setCurrentIndex(moduleIndex)
    setModuleReady(completedIndices.has(moduleIndex))
  }

  const handleNext = async () => {
    if (!canNext) return
    if (isLast) {
      const scores = moduleScoresRef.current
      const avg =
        scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
          : 100
      const allPassed = scores.every((s) => s.passed)
      setCourseScore(avg)
      await finish(avg, allPassed)
      if (assignment) {
        await updateAssignment(assignment.id, {
          status: 'completed',
        })
      }
      setFinished(true)
      return
    }
    setCurrentIndex((i) => i + 1)
    setModuleReady(completedIndices.has(currentIndex + 1))
  }

  if (isLoading || !course) {
    return <Skeleton className="h-64 sm:h-96 w-full" />
  }

  if (finished) {
    const scores = moduleScoresRef.current
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 px-4 max-w-lg mx-auto"
      >
        <PartyPopper className="h-14 w-14 sm:h-16 sm:w-16 text-primary" />
        <h2 className="text-2xl sm:text-3xl font-bold">Course Complete!</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          {course.title} — saved to your training profile
        </p>
        {courseScore !== null && (
          <div className="w-full rounded-lg border bg-card p-4 text-left space-y-2">
            <p className="font-semibold text-center text-lg">Overall score: {courseScore}%</p>
            <ul className="text-sm space-y-1">
              {scores.map((s) => (
                <li key={s.moduleId} className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">{s.title}</span>
                  <span className={s.passed ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                    {s.score}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button size="lg" className="w-full max-w-xs min-h-12" onClick={() => navigate(dashboardPath)}>
          Return to Dashboard
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-24 lg:pb-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="h-11 -ml-2" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden xs:inline">Back</span>
        </Button>
        <span className="text-xs sm:text-sm text-muted-foreground tabular-nums">{formatDuration(elapsed)}</span>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold leading-tight">{course.title}</h1>
      <CourseViewer
        key={modules[currentIndex]?.id ?? `module-${currentIndex}`}
        modules={modules}
        currentIndex={currentIndex}
        completedIndices={completedIndices}
        moduleComplete={canNext}
        onModuleComplete={handleModuleComplete}
        onReviewLesson={handleReviewLesson}
      />
      <div
        className={cn(
          'fixed left-0 right-0 z-30 border-t bg-background/95 backdrop-blur p-3 safe-area-px safe-area-pb',
          'bottom-mobile-nav lg:bottom-0 lg:sticky lg:mt-4 lg:border-t lg:p-0 lg:bg-background lg:backdrop-blur-none'
        )}
      >
        <div className="flex gap-2 max-w-5xl mx-auto lg:pt-4">
          <Button
            variant="outline"
            className="flex-1 min-h-12"
            disabled={currentIndex === 0}
            onClick={() => {
              setCurrentIndex((i) => i - 1)
              setModuleReady(completedIndices.has(currentIndex - 1))
            }}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <Button className="flex-1 min-h-12" onClick={handleNext} disabled={!canNext}>
            <span>{isLast ? 'Finish' : 'Next'}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Button>
        </div>
      </div>
    </div>
  )
}
