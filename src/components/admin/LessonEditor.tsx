import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LessonImageInput } from '@/components/admin/LessonImageInput'
import { SlideBodyContent } from '@/components/training/SlideBodyContent'
import { LESSON_ILLUSTRATION_KEYS } from '@/components/training/lesson-illustrations'
import { LESSON_LAYOUTS, LESSON_LAYOUT_LABELS, newSlideId } from '@/lib/module-defaults'
import { parseYouTubeVideoId } from '@/lib/youtube'
import { useState } from 'react'
import type { LessonContent, LessonSlide } from '@/types/course.types'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const textareaClass =
  'flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function LessonEditor({
  content,
  onChange,
}: {
  content: LessonContent
  onChange: (content: LessonContent) => void
}) {
  const slides = content.slides ?? []
  const [previewSlideIds, setPreviewSlideIds] = useState<Set<string>>(new Set())

  const updateSlide = (index: number, patch: Partial<LessonSlide>) => {
    const next = slides.map((slide, i) => (i === index ? { ...slide, ...patch } : slide))
    onChange({ ...content, slides: next })
  }

  const updateIllustration = (index: number, patch: Partial<NonNullable<LessonSlide['illustration']>>) => {
    const slide = slides[index]
    updateSlide(index, {
      illustration: { alt: slide?.heading ?? 'Illustration', ...slide?.illustration, ...patch },
    })
  }

  const updateYouTubeUrl = (index: number, rawUrl: string) => {
    const videoId = parseYouTubeVideoId(rawUrl)
    if (!rawUrl.trim()) {
      updateSlide(index, { youtube: undefined })
      return
    }
    if (videoId) {
      updateSlide(index, { youtube: { videoId } })
    }
  }

  const addSlide = () => {
    onChange({
      ...content,
      slides: [
        ...slides,
        {
          id: newSlideId(),
          heading: 'New slide',
          body: '',
          layout: 'image-right',
          illustration: { alt: 'Illustration', caption: '' },
        },
      ],
    })
  }

  const addImageOnlySlide = () => {
    onChange({
      ...content,
      slides: [
        ...slides,
        {
          id: newSlideId(),
          heading: 'Image slide',
          body: '',
          layout: 'image-only',
          illustration: { alt: 'Slide image', caption: '' },
        },
      ],
    })
  }

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return
    onChange({ ...content, slides: slides.filter((_, i) => i !== index) })
  }

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= slides.length) return
    const next = [...slides]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange({ ...content, slides: next })
  }

  const togglePreview = (slideId: string) => {
    setPreviewSlideIds((prev) => {
      const next = new Set(prev)
      if (next.has(slideId)) next.delete(slideId)
      else next.add(slideId)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Slides ({slides.length})</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addImageOnlySlide}>
            <Plus className="h-3 w-3 mr-1" /> Add image slide
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={addSlide}>
            <Plus className="h-3 w-3 mr-1" /> Add slide
          </Button>
        </div>
      </div>

      {slides.map((slide, index) => {
        const isImageOnly = slide.layout === 'image-only'
        return (
        <div key={slide.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Slide {index + 1}</p>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={index === 0}
                onClick={() => moveSlide(index, -1)}
                aria-label="Move slide up"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={index === slides.length - 1}
                onClick={() => moveSlide(index, 1)}
                aria-label="Move slide down"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                disabled={slides.length <= 1}
                onClick={() => removeSlide(index)}
                aria-label="Remove slide"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Layout</Label>
            <select
              className={selectClass}
              value={slide.layout ?? 'image-right'}
              onChange={(e) =>
                updateSlide(index, { layout: e.target.value as LessonSlide['layout'] })
              }
            >
              {LESSON_LAYOUTS.map((layout) => (
                <option key={layout} value={layout}>
                  {LESSON_LAYOUT_LABELS[layout]}
                </option>
              ))}
            </select>
            {isImageOnly && (
              <p className="text-xs text-muted-foreground">
                Image-only slides show the picture full width. Heading and body are hidden from learners.
              </p>
            )}
          </div>

          {!isImageOnly && (
            <>
              <div className="space-y-2">
                <Label>Heading</Label>
                <Input
                  value={slide.heading}
                  onChange={(e) => updateSlide(index, { heading: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Body</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => togglePreview(slide.id)}
                  >
                    {previewSlideIds.has(slide.id) ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" /> Edit
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" /> Preview
                      </>
                    )}
                  </Button>
                </div>
                {previewSlideIds.has(slide.id) ? (
                  <div className="rounded-md border bg-background p-4 min-h-[96px]">
                    {slide.body.trim() ? (
                      <SlideBodyContent body={slide.body} />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No body content yet.</p>
                    )}
                  </div>
                ) : (
                  <>
                    <textarea
                      className={textareaClass}
                      value={slide.body}
                      onChange={(e) => updateSlide(index, { body: e.target.value })}
                      placeholder="Supports Markdown and HTML: **bold**, lists, links, etc."
                    />
                    <p className="text-xs text-muted-foreground">
                      Markdown and HTML supported. Use Preview to see how learners will view this slide.
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Built-in illustration</Label>
              <select
                className={selectClass}
                value={slide.illustration?.key ?? ''}
                onChange={(e) => {
                  const key = e.target.value
                  if (!key) {
                    updateSlide(index, { illustration: undefined })
                  } else {
                    updateIllustration(index, { key })
                  }
                }}
              >
                <option value="">None</option>
                {LESSON_ILLUSTRATION_KEYS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{isImageOnly ? 'Image alt text' : 'Illustration alt text'}</Label>
              <Input
                value={slide.illustration?.alt ?? ''}
                onChange={(e) => updateIllustration(index, { alt: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Caption (optional)</Label>
            <Input
              value={slide.illustration?.caption ?? ''}
              onChange={(e) => updateIllustration(index, { caption: e.target.value })}
            />
          </div>

          {!isImageOnly && (
            <div className="space-y-2">
              <Label>YouTube video URL (optional)</Label>
              <Input
                value={slide.youtube?.videoId ?? ''}
                onChange={(e) => updateYouTubeUrl(index, e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
              />
              <p className="text-xs text-muted-foreground">
                When set, learners must watch the full video before advancing past this slide.
              </p>
            </div>
          )}

          <LessonImageInput
            url={slide.illustration?.url ?? ''}
            alt={slide.illustration?.alt ?? slide.heading}
            onUrlChange={(nextUrl) => {
              if (!nextUrl.trim()) {
                updateIllustration(index, { url: undefined })
              } else {
                updateIllustration(index, { url: nextUrl })
              }
            }}
          />

          {isImageOnly && !slide.illustration?.url && !slide.illustration?.key && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Add an image URL, upload, or choose a built-in illustration for this slide.
            </p>
          )}
        </div>
        )
      })}
    </div>
  )
}
