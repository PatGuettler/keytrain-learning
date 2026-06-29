import { useRef, useState } from 'react'
import { ClipboardPaste, ImagePlus, Loader2 } from 'lucide-react'
import { uploadCourseImage } from '@/services/course-images.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LessonImageInputProps = {
  url: string
  alt: string
  onUrlChange: (url: string) => void
}

export function LessonImageInput({ url, alt, onUrlChange }: LessonImageInputProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const pasteRef = useRef<HTMLDivElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const publicUrl = await uploadCourseImage(file)
      onUrlChange(publicUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) await uploadFile(file)
        return
      }
    }
  }

  return (
    <div
      ref={pasteRef}
      tabIndex={0}
      className="space-y-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onPaste={handlePaste}
    >
      <Label>Slide image</Label>
      <p className="text-xs text-muted-foreground">
        Paste from clipboard, upload from device, or enter a URL. Leave blank to use the built-in illustration.
      </p>

      {url && (
        <figure className="rounded-md border overflow-hidden bg-muted/30 max-w-sm">
          <img src={url} alt={alt || 'Slide preview'} className="w-full h-auto max-h-40 object-cover" />
        </figure>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          value={url}
          onChange={(e) => {
            onUrlChange(e.target.value)
            setError('')
          }}
          placeholder="https://…"
          className="flex-1 min-w-[12rem]"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
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
            <ImagePlus className="h-4 w-4 mr-1" />
          )}
          Upload
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => pasteRef.current?.focus()}
          title="Focus here, then press Ctrl+V to paste an image"
        >
          <ClipboardPaste className="h-4 w-4 mr-1" />
          Paste
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
