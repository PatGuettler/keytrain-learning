import { useCallback, useEffect, useState } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'

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
  const [elapsed, setElapsed] = useState(0)

  const { finish } = useTrainingSession(
    assignment?.id ?? 'demo',
    userId,
    courseId!,
    Boolean(assignment || !assignment)
  )

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const onModuleComplete = useCallback(
    (_score?: number, passed?: boolean) => {
      setCompletedIndices((prev) => new Set(prev).add(currentIndex))
      setModuleReady(true)
      if (modules[currentIndex]?.type === 'quiz' && passed === false) {
        setModuleReady(false)
      }
    },
    [currentIndex, modules]
  )

  const canNext = moduleReady || completedIndices.has(currentIndex)
  const isLast = currentIndex >= modules.length - 1

  const handleNext = async () => {
    if (!canNext) return
    if (isLast) {
      await finish(100, true)
      if (assignment) await updateAssignment(assignment.id, { status: 'completed' })
      setFinished(true)
      return
    }
    setCurrentIndex((i) => i + 1)
    setModuleReady(false)
  }

  if (isLoading || !course) {
    return <Skeleton className="h-64 sm:h-96 w-full" />
  }

  if (finished) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 px-4"
      >
        <PartyPopper className="h-14 w-14 sm:h-16 sm:w-16 text-primary" />
        <h2 className="text-2xl sm:text-3xl font-bold">Course Complete!</h2>
        <p className="text-muted-foreground text-sm sm:text-base">Great work on {course.title}</p>
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
        modules={modules}
        currentIndex={currentIndex}
        completedIndices={completedIndices}
        moduleComplete={canNext}
        onModuleComplete={(score, passed) => {
          onModuleComplete(score, passed)
          if (modules[currentIndex]?.type !== 'quiz') setModuleReady(true)
          else if (passed) setModuleReady(true)
        }}
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
