import { Link } from 'react-router-dom'
import { Clock, Lock, Play } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Assignment, Course } from '@/types/course.types'
import { STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

interface CourseCardProps {
  course: Course
  assignment?: Assignment
  playHref: string
  hasCompletedAttempt?: boolean
}

export function CourseCard({
  course,
  assignment,
  playHref,
  hasCompletedAttempt = false,
}: CourseCardProps) {
  const takeBy = course.publication?.available_until ?? assignment?.due_date
  const maxAttempts = course.max_attempts ?? 3
  const isLocked = Boolean(assignment?.locked_at)
  const attemptsUsed = assignment?.attempts_used ?? 0
  const showResults = Boolean(course.show_results_after_completion && hasCompletedAttempt)
  const isCompleted = assignment?.status === 'completed'
  const resultsHref = `${playHref}?results=1`

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow overflow-hidden">
      <div className="h-28 sm:h-32 bg-gradient-to-br from-primary/20 to-accent rounded-t-lg flex items-center justify-center shrink-0 overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : isLocked ? (
          <Lock className="h-10 w-10 text-destructive opacity-80" />
        ) : (
          <Play className="h-10 w-10 text-primary opacity-60" />
        )}
      </div>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <CardTitle className="text-base sm:text-lg leading-snug min-w-0">{course.title}</CardTitle>
          <div className="flex flex-wrap gap-1.5 shrink-0 self-start">
            <Badge variant="outline" className="w-fit">
              Required
            </Badge>
            {assignment && isLocked && (
              <Badge variant="destructive" className="w-fit">
                Locked
              </Badge>
            )}
            {assignment && (
              <Badge
                variant={assignment.status === 'completed' ? 'success' : 'secondary'}
                className="w-fit"
              >
                {STATUS_LABELS[assignment.status]}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="line-clamp-3 sm:line-clamp-2 text-sm leading-relaxed">
          {course.description}
        </CardDescription>
        {takeBy && (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Take by {formatDate(takeBy)}
          </p>
        )}
        {assignment && assignment.status !== 'completed' && (
          <p className="text-xs text-muted-foreground">
            {isLocked
              ? `All ${maxAttempts} attempts used — request unlock to continue`
              : `${attemptsUsed} of ${maxAttempts} attempts used`}
          </p>
        )}
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-0">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5 shrink-0">
          <Clock className="h-4 w-4 shrink-0" />
          {course.estimated_minutes} min
        </span>
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
          {showResults && (
            <Button asChild size="sm" variant="outline" className="min-h-11 w-full sm:w-auto">
              <Link to={resultsHref}>View results</Link>
            </Button>
          )}
          {!isCompleted && (
            <Button asChild size="sm" className="min-h-11 w-full sm:w-auto sm:min-w-[5.5rem]">
              <Link to={playHref}>
                {isLocked ? 'View' : assignment?.status === 'in_progress' ? 'Continue' : 'Start'}
              </Link>
            </Button>
          )}
          {isCompleted && !showResults && (
            <Button size="sm" className="min-h-11 w-full sm:w-auto" disabled>
              Completed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
