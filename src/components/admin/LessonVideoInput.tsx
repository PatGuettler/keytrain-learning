import { useRef, useState } from 'react'
import { Film, Loader2, Upload } from 'lucide-react'
import { uploadCourseVideo } from '@/services/course-videos.service'
import { parseVideoInput, resolveSlideVideo, videoToInputValue } from '@/lib/video'
import type { LessonSlide } from '@/types/course.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LessonVideoInputProps = {
  slide: Pick<LessonSlide, 'video' | 'youtube'>
  onVideoChange: (video: LessonSlide['video']) => void
}

export function LessonVideoInput({ slide, onVideoChange }: LessonVideoInputProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [draftUrl, setDraftUrl] = useState('')

  const resolved = resolveSlideVideo(slide)
  const displayValue = draftUrl || videoToInputValue(resolved)

  const applyInput = (raw: string) => {
    setDraftUrl(raw)
    setError('')
    if (!raw.trim()) {
      onVideoChange(undefined)
      return
    }
    const parsed = parseVideoInput(raw)
    if (parsed) {
      onVideoChange(parsed)
      setDraftUrl('')
    }
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const publicUrl = await uploadCourseVideo(file)
      onVideoChange({ provider: 'direct', url: publicUrl })
      setDraftUrl('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const providerLabel = resolved
    ? resolved.provider === 'youtube'
      ? 'YouTube'
      : resolved.provider === 'vimeo'
        ? 'Vimeo'
        : resolved.provider === 'loom'
          ? 'Loom'
          : 'Uploaded / direct link'
    : null

  return (
    <div className="space-y-2">
      <Label>Video (optional)</Label>
      <p className="text-xs text-muted-foreground">
        Paste a YouTube, Vimeo, or Loom link, enter a direct MP4/WebM URL, or upload a video file.
        Learners must watch the full video before advancing past this slide.
      </p>

      {resolved && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Film className="h-3.5 w-3.5 shrink-0" />
          {providerLabel} video attached
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          value={displayValue}
          onChange={(e) => applyInput(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=… or https://…/video.mp4"
          className="flex-1 min-w-[12rem]"
        />
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadFile(file)
            e.target.value = ''
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          Upload video
        </Button>
        {resolved && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onVideoChange(undefined)
              setDraftUrl('')
              setError('')
            }}
          >
            Remove
          </Button>
        )}
      </div>

      {displayValue.trim() && !parseVideoInput(displayValue) && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Unrecognized link. Supported: YouTube, Vimeo, Loom, direct MP4/WebM/MOV URLs, or upload a
          file.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
