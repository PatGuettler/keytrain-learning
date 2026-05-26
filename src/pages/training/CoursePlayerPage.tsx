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
    return <Skeleton className="h-96 w-full" />
  }

  if (finished) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6"
      >
        <PartyPopper className="h-16 w-16 text-primary" />
        <h2 className="text-3xl font-bold">Course Complete!</h2>
        <p className="text-muted-foreground">Great work on {course.title}</p>
        <Button size="lg" onClick={() => navigate(dashboardPath)}>
          Return to Dashboard
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <span className="text-sm text-muted-foreground">{formatDuration(elapsed)}</span>
      </div>
      <h1 className="text-2xl font-bold">{course.title}</h1>
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
      <div className="flex justify-between border-t pt-4 sticky bottom-16 lg:bottom-0 bg-background">
        <Button
          variant="outline"
          disabled={currentIndex === 0}
          onClick={() => {
            setCurrentIndex((i) => i - 1)
            setModuleReady(completedIndices.has(currentIndex - 1))
          }}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Button onClick={handleNext} disabled={!canNext}>
          {isLast ? 'Finish' : 'Next'} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
