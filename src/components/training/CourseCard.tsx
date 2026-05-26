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
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="h-32 bg-gradient-to-br from-primary/20 to-accent rounded-t-lg flex items-center justify-center">
        <Play className="h-10 w-10 text-primary opacity-60" />
      </div>
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg">{course.title}</CardTitle>
          {assignment && (
            <Badge variant={assignment.status === 'completed' ? 'success' : 'secondary'}>
              {STATUS_LABELS[assignment.status]}
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2">{course.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex items-center justify-between">
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {course.estimated_minutes} min
        </span>
        <Button asChild size="sm">
          <Link to={playHref}>Start</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
