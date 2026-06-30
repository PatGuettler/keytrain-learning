import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardX, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchUserModuleAttempts, fetchSessions } from '@/services/sessions.service'
import { useModules } from '@/hooks/useCourses'
import type { TrainingSession } from '@/types/course.types'

function latestCompletedSession(
  sessions: TrainingSession[],
  assignmentId: string,
  courseId: string
): TrainingSession | undefined {
  return sessions
    .filter(
      (s) =>
        s.assignment_id === assignmentId &&
        s.course_id === courseId &&
        Boolean(s.completed_at)
    )
    .sort(
      (a, b) =>
        new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
    )[0]
}

export function CourseAttemptResultsView({
  courseId,
  courseTitle,
  assignmentId,
  userId,
  trainingPath,
}: {
  courseId: string
  courseTitle: string
  assignmentId: string
  userId: string
  trainingPath: string
}) {
  const navigate = useNavigate()
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['training-sessions', userId],
    queryFn: () => fetchSessions(userId),
  })
  const { data: moduleAttempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['user-module-attempts', userId],
    queryFn: () => fetchUserModuleAttempts(userId),
  })
  const { data: modules = [], isLoading: modulesLoading } = useModules(courseId)

  const session = useMemo(
    () => latestCompletedSession(sessions, assignmentId, courseId),
    [sessions, assignmentId, courseId]
  )

  const moduleScores = useMemo(() => {
    if (!session) return []
    const attemptsForSession = moduleAttempts.filter((a) => a.session_id === session.id)
    const byModuleId = new Map(attemptsForSession.map((a) => [a.module_id, a]))
    return modules.map((mod) => {
      const attempt = byModuleId.get(mod.id)
      const passed =
        attempt?.interactions?.passed === true ||
        (attempt?.score != null &&
          attempt.score >= ((mod.content as { passing_score?: number })?.passing_score ?? 80))
      return {
        moduleId: mod.id,
        title: mod.title,
        score: attempt?.score ?? 0,
        passed: Boolean(attempt && passed),
      }
    })
  }, [session, moduleAttempts, modules])

  const isLoading = sessionsLoading || attemptsLoading || modulesLoading

  if (isLoading) {
    return <Skeleton className="h-64 w-full max-w-lg mx-auto" />
  }

  if (!session) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-12 px-4">
        <p className="text-sm text-muted-foreground">No completed attempt results are available yet.</p>
        <Button onClick={() => navigate(trainingPath)}>Back to training</Button>
      </div>
    )
  }

  const passed = Boolean(session.passed)
  const courseScore =
    session.score != null
      ? Math.round(Number(session.score))
      : moduleScores.length > 0
        ? Math.round(
            moduleScores.reduce((sum, s) => sum + s.score, 0) / moduleScores.length
          )
        : null

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 px-4 max-w-lg mx-auto">
      {passed ? (
        <PartyPopper className="h-14 w-14 sm:h-16 sm:w-16 text-primary" />
      ) : (
        <ClipboardX className="h-12 w-12 text-amber-600" />
      )}
      <h2 className="text-2xl sm:text-3xl font-bold">
        {passed ? 'Exam passed' : 'Exam not passed'}
      </h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        {courseTitle} — attempt {session.attempt_number}
      </p>
      {courseScore !== null && (
        <div className="w-full rounded-lg border bg-card p-4 text-left space-y-2">
          <p className="font-semibold text-center text-lg">Overall score: {courseScore}%</p>
          <ul className="text-sm space-y-1">
            {moduleScores.map((s) => (
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
    </div>
  )
}
