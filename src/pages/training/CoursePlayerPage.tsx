import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ClipboardX, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CourseViewer } from '@/components/training/CourseViewer'
import { CourseLockedScreen } from '@/components/training/CourseLockedScreen'
import { CourseUnavailable } from '@/components/training/CourseUnavailable'
import { useCourse, useModules } from '@/hooks/useCourses'
import { useAssignments } from '@/hooks/useAssignments'
import { useTrainingSession } from '@/hooks/useTrainingSession'
import { useAuthStore } from '@/store/authStore'
import {
  recordCourseAttemptResult,
  syncRequiredAssignmentsForUser,
} from '@/services/assignments.service'
import { saveModuleAttempt } from '@/services/sessions.service'
import { fetchPendingUnlockForAssignment } from '@/services/unlock-requests.service'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveAttemptsUsed } from '@/lib/dashboard-stats'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { SAVE_COURSE_RESULT_ERROR, toServiceErrorMessage } from '@/lib/service-errors'
import type { CourseAttemptResult } from '@/types/training.types'
import type { ModuleCompletePayload } from '@/types/training.types'

interface ModuleScoreRecord {
  moduleId: string
  title: string
  score: number
  passed: boolean
}

type FinishOutcome = 'passed' | 'failed' | 'locked'

export function CoursePlayerPage({
  trainingPath = '/employee/training',
}: {
  trainingPath?: string
}) {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.userId)!
  const orgId = useAuthStore((s) => s.profile?.org_id)!
  const queryClient = useQueryClient()
  const { data: course, isLoading: courseLoading, isFetched: courseFetched } = useCourse(courseId!)
  const { data: modules = [], isLoading } = useModules(courseId!)
  const { data: assignments = [] } = useAssignments(userId)
  const assignment = assignments.find((a) => a.course_id === courseId)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set())
  const [moduleReady, setModuleReady] = useState(false)
  const [finished, setFinished] = useState(false)
  const [outcome, setOutcome] = useState<FinishOutcome | null>(null)
  const [attemptInfo, setAttemptInfo] = useState<CourseAttemptResult | null>(null)
  const [courseScore, setCourseScore] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [finishError, setFinishError] = useState('')
  const [finishing, setFinishing] = useState(false)
  const moduleScoresRef = useRef<ModuleScoreRecord[]>([])

  const maxAttempts = course?.max_attempts ?? 3
  const unlimitedAttempts = maxAttempts === 0
  const isLocked = !unlimitedAttempts && Boolean(assignment?.locked_at)

  const { data: pendingUnlock } = useQuery({
    queryKey: ['unlock-request', assignment?.id, userId],
    queryFn: () => fetchPendingUnlockForAssignment(assignment!.id, userId),
    enabled: Boolean(assignment?.id && isLocked),
  })

  const canStartSession = Boolean(
    userId && courseId && assignment?.id && !isLocked && assignment.status !== 'completed'
  )

  const { session, finish } = useTrainingSession(
    assignment?.id ?? '',
    userId,
    courseId!,
    canStartSession && !finished
  )

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!assignment?.id || !isLocked) return
    const intervalId = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ['assignments', userId] })
      void queryClient.invalidateQueries({ queryKey: ['unlock-request', assignment.id, userId] })
    }, 5000)
    return () => window.clearInterval(intervalId)
  }, [assignment?.id, isLocked, userId, queryClient])

  useEffect(() => {
    if (!course || assignment || !userId) return
    void syncRequiredAssignmentsForUser(userId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['assignments', userId] })
      void queryClient.invalidateQueries({ queryKey: ['training-sessions', userId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    })
  }, [course, assignment, userId, queryClient])

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

      setModuleReady(true)
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
    if (!canNext || !assignment || finishing) return
    if (isLast) {
      setFinishing(true)
      setFinishError('')
      try {
        const scores = moduleScoresRef.current
        const avg =
          scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
            : 100
        const allPassed = scores.every((s) => s.passed)
        setCourseScore(avg)
        await finish(avg, allPassed)
        const result = await recordCourseAttemptResult(assignment.id, allPassed, maxAttempts, avg)
        setAttemptInfo(result)
        setOutcome(allPassed ? 'passed' : result.locked ? 'locked' : 'failed')
        setFinished(true)
        void queryClient.invalidateQueries({ queryKey: ['assignments', userId] })
        void queryClient.invalidateQueries({ queryKey: ['training-sessions', userId] })
        void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      } catch (e) {
        setFinishError(toServiceErrorMessage(e, SAVE_COURSE_RESULT_ERROR))
      } finally {
        setFinishing(false)
      }
      return
    }
    setCurrentIndex((i) => i + 1)
    setModuleReady(completedIndices.has(currentIndex + 1))
  }

  if (isLoading || courseLoading) {
    return <Skeleton className="h-64 sm:h-96 w-full" />
  }

  if (courseFetched && !course) {
    return <CourseUnavailable trainingPath={trainingPath} />
  }

  if (!course) {
    return <Skeleton className="h-64 sm:h-96 w-full" />
  }

  if (assignment && isLocked) {
    return (
      <CourseLockedScreen
        course={course}
        assignment={assignment}
        orgId={orgId}
        userId={userId}
        trainingPath={trainingPath}
        pendingRequest={Boolean(pendingUnlock)}
        onRequestSent={() => {
          void queryClient.invalidateQueries({ queryKey: ['unlock-request', assignment.id, userId] })
        }}
      />
    )
  }

  if (assignment?.status === 'completed' && !finished) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-12">
        <PartyPopper className="h-12 w-12 text-primary mx-auto" />
        <h2 className="text-xl font-semibold">Already completed</h2>
        <p className="text-sm text-muted-foreground">You have passed {course.title}.</p>
        <Button onClick={() => navigate(trainingPath)}>Back to Required Training</Button>
      </div>
    )
  }

  if (finished && outcome) {
    const scores = moduleScoresRef.current

    if (outcome === 'passed') {
      return (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 px-4 max-w-lg mx-auto"
        >
          <PartyPopper className="h-14 w-14 sm:h-16 sm:w-16 text-primary" />
          <h2 className="text-2xl sm:text-3xl font-bold">Exam passed</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {course.title} — your result has been saved
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
          <Button size="lg" className="w-full max-w-xs min-h-12" onClick={() => navigate(trainingPath)}>
            Back to training
          </Button>
        </motion.div>
      )
    }

    if (outcome === 'locked') {
      return (
        <CourseLockedScreen
          course={course}
          assignment={assignment!}
          orgId={orgId}
          userId={userId}
          trainingPath={trainingPath}
          onRequestSent={() => {
            void queryClient.invalidateQueries({ queryKey: ['unlock-request', assignment!.id, userId] })
          }}
        />
      )
    }

    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 px-4 max-w-lg mx-auto"
      >
        <ClipboardX className="h-12 w-12 text-amber-600" />
        <h2 className="text-2xl font-bold">Exam not passed</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {attemptInfo
            ? attemptInfo.attemptsRemaining > 0
              ? `This attempt has been recorded. You have ${attemptInfo.attemptsRemaining} more attempt${attemptInfo.attemptsRemaining === 1 ? '' : 's'} — start again from Required Training when ready.`
              : 'You have used all allowed attempts for this course. Contact your administrator if you need access restored.'
            : 'This attempt has been recorded. Return to Required Training to start a new attempt when one is available.'}
        </p>
        <Button size="lg" className="w-full max-w-xs min-h-12" onClick={() => navigate(trainingPath)}>
          Back to training
        </Button>
      </motion.div>
    )
  }

  const attemptLabel =
    assignment && !unlimitedAttempts
      ? `Attempt ${session?.attempt_number ?? resolveAttemptsUsed(assignment) + 1} of ${maxAttempts}`
      : assignment
        ? `Attempt ${session?.attempt_number ?? resolveAttemptsUsed(assignment) + 1}`
        : null

  return (
    <div className="space-y-3 sm:space-y-4 w-full min-w-0 max-w-5xl mx-auto pb-course-player-footer lg:pb-4">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <Button variant="ghost" size="sm" className="h-11 shrink-0" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="text-xs sm:text-sm text-muted-foreground text-right">
          {attemptLabel && <p>{attemptLabel}</p>}
          <p className="tabular-nums">{formatDuration(elapsed)}</p>
        </div>
      </div>
      <h1 className="text-lg sm:text-2xl font-bold leading-snug break-anywhere pr-1">{course.title}</h1>
      <CourseViewer
        key={modules[currentIndex]?.id ?? `module-${currentIndex}`}
        modules={modules}
        currentIndex={currentIndex}
        completedIndices={completedIndices}
        onModuleComplete={handleModuleComplete}
        onReviewLesson={handleReviewLesson}
      />
      <div
        className={cn(
          'fixed left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90',
          'p-3 safe-area-px safe-area-pb bottom-0',
          'lg:static lg:z-auto lg:mt-4 lg:border-t-0 lg:p-0 lg:bg-transparent lg:backdrop-blur-none'
        )}
        style={{ minHeight: 'var(--course-player-footer-height)' }}
      >
        <div className="flex flex-col gap-2 w-full max-w-5xl mx-auto">
          {finishError && (
            <p className="text-sm text-destructive text-center px-2">{finishError}</p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 min-h-12"
              disabled={currentIndex === 0 || finishing}
              onClick={() => {
                setCurrentIndex((i) => i - 1)
                setModuleReady(completedIndices.has(currentIndex - 1))
              }}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Previous module</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <Button className="flex-1 min-h-12" onClick={() => void handleNext()} disabled={!canNext || finishing}>
              <span>{finishing ? 'Submitting…' : isLast ? 'Submit exam' : 'Next module'}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
