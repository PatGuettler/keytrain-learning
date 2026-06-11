import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestCourseUnlock } from '@/services/unlock-requests.service'
import type { Assignment, Course } from '@/types/course.types'

export function CourseLockedScreen({
  course,
  assignment,
  orgId,
  userId,
  trainingPath,
  pendingRequest,
  onRequestSent,
}: {
  course: Course
  assignment: Assignment
  orgId: string
  userId: string
  trainingPath: string
  pendingRequest?: boolean
  onRequestSent?: () => void
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(pendingRequest)
  const maxAttempts = course.max_attempts ?? 3

  useEffect(() => {
    if (pendingRequest) setSent(true)
  }, [pendingRequest])

  const handleRequest = async () => {
    setLoading(true)
    setError('')
    try {
      await requestCourseUnlock({
        assignmentId: assignment.id,
        userId,
        courseId: course.id,
        orgId,
        message,
      })
      setSent(true)
      onRequestSent?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardContent className="flex flex-col items-center text-center gap-4 py-10 px-6">
        <Lock className="h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Course locked</h2>
          <p className="text-sm text-muted-foreground">
            You have used all {maxAttempts} attempts for <strong>{course.title}</strong>.
            An administrator must unlock the course before you can try again.
          </p>
        </div>

        {sent ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            Unlock request sent. You will be notified when an admin reviews it.
          </p>
        ) : (
          <div className="w-full space-y-3 text-left">
            <div className="space-y-2">
              <Label htmlFor="unlock-note">Note to admin (optional)</Label>
              <Input
                id="unlock-note"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. I reviewed the material and am ready to retake"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={loading} onClick={() => void handleRequest()}>
              {loading ? 'Sending…' : 'Request unlock from admin'}
            </Button>
          </div>
        )}

        <Button variant="outline" asChild>
          <Link to={trainingPath}>Back to Required Training</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
