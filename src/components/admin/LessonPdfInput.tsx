import { useRef, useState } from 'react'
import { FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadCoursePdf } from '@/services/course-pdfs.service'
import type { LessonSlidePdf } from '@/types/course.types'

export function LessonPdfInput({
  pdf,
  onChange,
}: {
  pdf?: LessonSlidePdf
  onChange: (pdf: LessonSlidePdf | undefined) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const uploaded = await uploadCoursePdf(file)
      onChange(uploaded)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload PDF')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>PDF document (optional)</Label>
      {pdf?.url ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-3">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <a
            href={pdf.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary truncate min-w-0 flex-1 hover:underline"
          >
            {pdf.fileName || 'Attached PDF'}
          </a>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            onClick={() => onChange(undefined)}
            aria-label="Remove PDF"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="max-w-xs"
            disabled={uploading}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
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
              <Upload className="h-3 w-3 mr-1" />
            )}
            Upload PDF
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Learners can view and download the PDF on this slide. Max 25 MB.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
