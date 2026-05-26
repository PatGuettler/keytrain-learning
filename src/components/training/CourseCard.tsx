import { Link } from 'react-router-dom'
import { Clock, Play } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Assignment, Course } from '@/types/course.types'
import { STATUS_LABELS } from '@/lib/constants'

interface CourseCardProps {
  course: Course
  assignment?: Assignment
  playHref: string
}

export function CourseCard({ course, assignment, playHref }: CourseCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow overflow-hidden">
      <div className="h-28 sm:h-32 bg-gradient-to-br from-primary/20 to-accent rounded-t-lg flex items-center justify-center shrink-0">
        <Play className="h-10 w-10 text-primary opacity-60" />
      </div>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <CardTitle className="text-base sm:text-lg leading-snug min-w-0">{course.title}</CardTitle>
          {assignment && (
            <Badge
              variant={assignment.status === 'completed' ? 'success' : 'secondary'}
              className="w-fit shrink-0 self-start"
            >
              {STATUS_LABELS[assignment.status]}
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-3 sm:line-clamp-2 text-sm leading-relaxed">
          {course.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-0">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5 shrink-0">
          <Clock className="h-4 w-4 shrink-0" />
          {course.estimated_minutes} min
        </span>
        <Button asChild size="sm" className="min-h-11 w-full sm:w-auto sm:min-w-[5.5rem]">
          <Link to={playHref}>Start</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
