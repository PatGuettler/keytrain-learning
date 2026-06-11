import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteCourse } from '@/services/courses.service'

type DeleteStep = 'idle' | 'confirm' | 'type-name'

export function DeleteCourseCard({
  courseId,
  courseTitle,
}: {
  courseId: string
  courseTitle: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<DeleteStep>('idle')
  const [typedTitle, setTypedTitle] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const titleMatches = typedTitle === courseTitle

  const reset = () => {
    setStep('idle')
    setTypedTitle('')
    setError('')
  }

  const handleDelete = async () => {
    if (!titleMatches) return
    setLoading(true)
    setError('')
    try {
      await deleteCourse(courseId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['hospital-courses'] }),
        queryClient.invalidateQueries({ queryKey: ['courses'] }),
        queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['course-publications', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['assignments'] }),
      ])
      navigate('/admin/courses', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setLoading(false)
    }
  }

  const blockPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
  }

  const blockDrop = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Delete course
        </CardTitle>
        <CardDescription>
          Permanently removes this course, all modules, publications, assignments, and training
          records. Staff will no longer see or access it. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'idle' && (
          <Button type="button" variant="destructive" onClick={() => setStep('confirm')}>
            Delete this course
          </Button>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium">
              First confirmation: Are you sure you want to delete <strong>{courseTitle}</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              All modules, publications, assignments, and training data for this course will be
              permanently deleted.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => setStep('type-name')}>
                Yes, continue with deletion
              </Button>
            </div>
          </div>
        )}

        {step === 'type-name' && (
          <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium">
              Second confirmation: Type the course title exactly to confirm deletion.
            </p>
            <p className="text-sm text-muted-foreground">
              Type <strong className="text-foreground">{courseTitle}</strong> below (pasting is
              disabled).
            </p>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm-course-title">Course title</Label>
              <Input
                id="delete-confirm-course-title"
                value={typedTitle}
                onChange={(e) => {
                  setTypedTitle(e.target.value)
                  setError('')
                }}
                onPaste={blockPaste}
                onDragOver={blockDrop}
                onDrop={blockDrop}
                autoComplete="off"
                spellCheck={false}
                placeholder="Type the course title"
                className="font-mono"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={reset} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!titleMatches || loading}
                onClick={handleDelete}
              >
                {loading ? 'Deleting…' : 'Permanently delete course'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
