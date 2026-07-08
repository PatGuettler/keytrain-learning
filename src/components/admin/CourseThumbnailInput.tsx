import { useRef, useState } from 'react'
import { ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { uploadCourseImage } from '@/services/course-images.service'

export function CourseThumbnailInput({
  url,
  onChange,
}: {
  url: string | null
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const nextUrl = await uploadCourseImage(file)
      onChange(nextUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload thumbnail')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2 max-w-md">
      <Label>Course thumbnail</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {url ? (
        <div className="space-y-2">
          <div className="relative h-32 rounded-lg border overflow-hidden bg-muted">
            <img src={url} alt="Course thumbnail" className="h-full w-full object-cover" />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <ImageIcon className="h-3 w-3 mr-1" />
              )}
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => onChange(null)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <ImageIcon className="h-3 w-3 mr-1" />
          )}
          Upload image
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Shown on Required Training cards. Uses the course-images storage bucket.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
