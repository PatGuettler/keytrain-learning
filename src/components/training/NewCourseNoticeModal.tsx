import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { CoursePublicationNotice } from '@/types/course.types'
import type { UserRole } from '@/types/user.types'

export function NewCourseNoticeModal({
  notices,
  role,
  onDismiss,
}: {
  notices: CoursePublicationNotice[]
  role: UserRole
  onDismiss: (publicationId: string) => Promise<void>
}) {
  const [dismissing, setDismissing] = useState<string | null>(null)

  if (notices.length === 0) return null

  const visibleNotices = notices.filter((n) => n.course?.title)
  if (visibleNotices.length === 0) return null

  const trainingBase = role === 'manager' ? '/manager/training' : '/employee/training'

  const handleDismiss = async (publicationId: string) => {
    setDismissing(publicationId)
    try {
      await onDismiss(publicationId)
    } finally {
      setDismissing(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-lg">New training available</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {visibleNotices.length === 1
              ? 'A new course has been published for your organization.'
              : `${visibleNotices.length} new courses have been published for your organization.`}
          </p>
          <ul className="space-y-3">
            {visibleNotices.map(({ publication, course }) => (
              <li key={publication.id} className="rounded-lg border p-4 space-y-3">
                <div>
                  <p className="font-medium">{course.title}</p>
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{course.description}</p>
                  )}
                </div>
                {publication.available_until ? (
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Take by {formatDate(publication.available_until)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No removal deadline</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link
                      to={`${trainingBase}/play/${course.id}`}
                      onClick={() => void handleDismiss(publication.id)}
                    >
                      Start course
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={dismissing === publication.id}
                    onClick={() => void handleDismiss(publication.id)}
                  >
                    {dismissing === publication.id ? 'Saving…' : 'Got it'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={Boolean(dismissing)}
            onClick={() => void Promise.all(visibleNotices.map((n) => handleDismiss(n.publication.id)))}
          >
            <X className="h-4 w-4 mr-1" />
            Dismiss all
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
