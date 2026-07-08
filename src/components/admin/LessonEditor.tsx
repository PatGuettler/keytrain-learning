import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LessonImageInput } from '@/components/admin/LessonImageInput'
import { LessonPdfInput } from '@/components/admin/LessonPdfInput'
import { LessonVideoInput } from '@/components/admin/LessonVideoInput'
import { MarkdownBodyField } from '@/components/admin/MarkdownBodyField'
import { SlideBodyContent } from '@/components/training/SlideBodyContent'
import { LESSON_ILLUSTRATION_KEYS } from '@/components/training/lesson-illustrations'
import { LESSON_LAYOUTS, LESSON_LAYOUT_LABELS, newSlideId } from '@/lib/module-defaults'
import { useState } from 'react'
import type { LessonContent, LessonSlide } from '@/types/course.types'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function hasIllustrationContent(ill: LessonSlide['illustration']): boolean {
  if (!ill) return false
  return Boolean(ill.key?.trim() || ill.url?.trim() || ill.caption?.trim())
}

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

  const updateIllustration = (
    index: number,
    patch: Partial<NonNullable<LessonSlide['illustration']>> | null
  ) => {
    if (patch === null) {
      updateSlide(index, { illustration: undefined })
      return
    }
    const slide = slides[index]
    const next = {
      alt: slide?.illustration?.alt ?? slide?.heading ?? '',
      ...slide?.illustration,
      ...patch,
    }
    if (!hasIllustrationContent(next) && !next.alt?.trim()) {
      updateSlide(index, { illustration: undefined })
      return
    }
    updateSlide(index, { illustration: next })
  }

  const clearIllustration = (index: number) => {
    updateSlide(index, { illustration: undefined })
  }

  const updateVideo = (index: number, video: LessonSlide['video']) => {
    updateSlide(index, { video, youtube: undefined })
  }

  const addSlide = () => {
    onChange({
      ...content,
      slides: [
        ...slides,
        {
          id: newSlideId(),
          heading: '',
          body: '',
          layout: 'content-only',
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
          heading: '',
          body: '',
          layout: 'image-only',
          illustration: { alt: 'Slide image', caption: '' },
        },
      ],
    })
  }

  const addVideoSlide = () => {
    onChange({
      ...content,
      slides: [
        ...slides,
        {
          id: newSlideId(),
          heading: '',
          body: '',
          layout: 'content-only',
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
          <Button type="button" size="sm" variant="outline" onClick={addVideoSlide}>
            <Plus className="h-3 w-3 mr-1" /> Add blank / video slide
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={addImageOnlySlide}>
            <Plus className="h-3 w-3 mr-1" /> Add image slide
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={addSlide}>
            <Plus className="h-3 w-3 mr-1" /> Add slide
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Every section is optional. Clear heading/body fields, set Built-in illustration to None, or
        choose Content only layout for a video- or PDF-only slide.
      </p>

      {slides.map((slide, index) => {
        const isImageOnly = slide.layout === 'image-only'
        const isContentOnly = slide.layout === 'content-only'
        const showTextSections = !isImageOnly
        const showIllustrationSections = !isContentOnly

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
                value={slide.layout ?? 'content-only'}
                onChange={(e) => {
                  const layout = e.target.value as LessonSlide['layout']
                  if (layout === 'content-only') {
                    updateSlide(index, { layout, illustration: undefined })
                  } else {
                    updateSlide(index, { layout })
                  }
                }}
              >
                {LESSON_LAYOUTS.map((layout) => (
                  <option key={layout} value={layout}>
                    {LESSON_LAYOUT_LABELS[layout]}
                  </option>
                ))}
              </select>
              {isImageOnly && (
                <p className="text-xs text-muted-foreground">
                  Image-only slides show the picture full width. Heading and body are hidden from
                  learners.
                </p>
              )}
              {isContentOnly && (
                <p className="text-xs text-muted-foreground">
                  Content-only slides have no illustration column — ideal for video- or PDF-only
                  lessons. Heading and body are optional.
                </p>
              )}
            </div>

            {showTextSections && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Heading (optional)</Label>
                    {slide.heading.trim() && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-muted-foreground"
                        onClick={() => updateSlide(index, { heading: '' })}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <Input
                    value={slide.heading}
                    placeholder="Leave blank for no heading"
                    onChange={(e) => updateSlide(index, { heading: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Body (optional)</Label>
                    <div className="flex gap-1">
                      {slide.body.trim() && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-muted-foreground"
                          onClick={() => updateSlide(index, { body: '' })}
                        >
                          Clear
                        </Button>
                      )}
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
                  </div>
                  {previewSlideIds.has(slide.id) ? (
                    <div className="rounded-md border bg-background p-4 min-h-[96px]">
                      {slide.body.trim() ? (
                        <SlideBodyContent body={slide.body} />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No body content.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <MarkdownBodyField
                        value={slide.body}
                        onChange={(body) => updateSlide(index, { body })}
                        placeholder="Optional. Leave empty for a video- or image-only slide."
                      />
                      <p className="text-xs text-muted-foreground">
                        Markdown and HTML supported. Leave empty if you only want video, image, or
                        PDF.
                      </p>
                    </>
                  )}
                </div>
              </>
            )}

            {showIllustrationSections && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Built-in illustration</Label>
                      {(slide.illustration?.key ||
                        slide.illustration?.url ||
                        slide.illustration?.caption) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-muted-foreground"
                          onClick={() => clearIllustration(index)}
                        >
                          Clear all images
                        </Button>
                      )}
                    </div>
                    <select
                      className={selectClass}
                      value={slide.illustration?.key ?? ''}
                      onChange={(e) => {
                        const key = e.target.value
                        if (!key) {
                          const rest = slide.illustration
                          if (rest?.url?.trim() || rest?.caption?.trim()) {
                            updateIllustration(index, { key: undefined })
                          } else {
                            clearIllustration(index)
                          }
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
                      placeholder="Optional"
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

                <LessonImageInput
                  url={slide.illustration?.url ?? ''}
                  alt={slide.illustration?.alt ?? slide.heading}
                  onUrlChange={(nextUrl) => {
                    if (!nextUrl.trim()) {
                      const rest = slide.illustration
                      if (rest?.key || rest?.caption?.trim()) {
                        updateIllustration(index, { url: undefined })
                      } else {
                        clearIllustration(index)
                      }
                    } else {
                      updateIllustration(index, { url: nextUrl })
                    }
                  }}
                />
              </>
            )}

            {!isImageOnly && (
              <LessonVideoInput
                slide={slide}
                onVideoChange={(video) => updateVideo(index, video)}
              />
            )}

            <LessonPdfInput
              pdf={slide.pdf}
              onChange={(pdf) => updateSlide(index, { pdf })}
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
