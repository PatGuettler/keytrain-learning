import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LESSON_ILLUSTRATION_KEYS } from '@/components/training/lesson-illustrations'
import { LESSON_LAYOUTS, newSlideId } from '@/lib/module-defaults'
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
          illustration: { key: 'clinical_incident', alt: 'Illustration', caption: '' },
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Slides ({slides.length})</p>
        <Button type="button" size="sm" variant="outline" onClick={addSlide}>
          <Plus className="h-3 w-3 mr-1" /> Add slide
        </Button>
      </div>

      {slides.map((slide, index) => (
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
            <Label>Heading</Label>
            <Input
              value={slide.heading}
              onChange={(e) => updateSlide(index, { heading: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <textarea
              className={textareaClass}
              value={slide.body}
              onChange={(e) => updateSlide(index, { body: e.target.value })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
                    {layout.replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Built-in illustration</Label>
              <select
                className={selectClass}
                value={slide.illustration?.key ?? 'clinical_incident'}
                onChange={(e) => updateIllustration(index, { key: e.target.value })}
              >
                {LESSON_ILLUSTRATION_KEYS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Illustration alt text</Label>
              <Input
                value={slide.illustration?.alt ?? ''}
                onChange={(e) => updateIllustration(index, { alt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Caption (optional)</Label>
              <Input
                value={slide.illustration?.caption ?? ''}
                onChange={(e) => updateIllustration(index, { caption: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom image URL (optional)</Label>
            <Input
              value={slide.illustration?.url ?? ''}
              onChange={(e) => updateIllustration(index, { url: e.target.value })}
              placeholder="https://… or leave blank for built-in illustration"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
