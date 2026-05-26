import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { LessonContent, LessonSlide } from '@/types/course.types'
import { cn } from '@/lib/utils'
import { LessonIllustration, resolveIllustrationKey } from './lesson-illustrations'

export function LessonRenderer({
  content,
  onComplete,
}: {
  content: LessonContent
  onComplete: () => void
}) {
  const slides = useMemo(
    () => (Array.isArray(content.slides) ? content.slides.filter(Boolean) : []),
    [content.slides]
  )
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [slides])

  const safeIndex = slides.length > 0 ? Math.min(index, slides.length - 1) : 0
  const slide = slides[safeIndex]
  const isLast = slides.length === 0 || safeIndex >= slides.length - 1

  const next = () => {
    if (slides.length === 0) {
      onComplete()
      return
    }
    if (isLast) onComplete()
    else setIndex((i) => Math.min(i + 1, slides.length - 1))
  }

  if (slides.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <p className="text-muted-foreground">This lesson has no slides yet.</p>
        <Button onClick={onComplete} className="min-h-11">
          Continue
        </Button>
      </div>
    )
  }

  if (!slide) {
    return null
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className={cn(
            'rounded-lg border bg-card p-4 sm:p-6',
            slide.layout === 'full-bleed' && 'bg-primary/5'
          )}
        >
          <SlideView slide={slide} />
        </motion.div>
      </AnimatePresence>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center text-sm text-muted-foreground">
        <span>
          Slide {safeIndex + 1} of {slides.length}
        </span>
        <Button onClick={next} className="min-h-11 w-full sm:w-auto">
          {isLast ? 'Complete Lesson' : 'Next Slide'}
        </Button>
      </div>
    </div>
  )
}

function SlideView({ slide }: { slide: LessonSlide }) {
  const illustration = slide.illustration
  const imageUrl = illustration?.url?.trim()
  const illustrationKey = resolveIllustrationKey(illustration?.key, slide.heading)
  const alt = illustration?.alt ?? slide.heading
  const layout = slide.layout ?? 'image-right'
  const showVisual =
    Boolean(imageUrl) ||
    Boolean(illustration?.key) ||
    layout === 'image-right' ||
    layout === 'image-left' ||
    layout === 'image-top' ||
    (layout === 'full-bleed' && illustration !== undefined)

  const visualBlock = (
    <figure className="rounded-lg overflow-hidden border bg-muted/50">
      {imageUrl ? (
        <img src={imageUrl} alt={alt} className="w-full h-auto max-h-64 object-cover" />
      ) : (
        <LessonIllustration illustrationKey={illustrationKey} alt={alt} className="w-full" />
      )}
      {illustration?.caption && (
        <figcaption className="text-xs text-muted-foreground px-3 py-2 border-t bg-card">
          {illustration.caption}
        </figcaption>
      )}
    </figure>
  )

  if (layout === 'full-bleed') {
    return (
      <div className="space-y-6">
        {showVisual && visualBlock}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-4">{slide.heading}</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{slide.body}</p>
        </div>
      </div>
    )
  }

  if (layout === 'image-top') {
    return (
      <div className="space-y-6">
        {showVisual && visualBlock}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-4">{slide.heading}</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{slide.body}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-6',
        showVisual && layout === 'image-right' && 'md:grid-cols-2',
        showVisual && layout === 'image-left' && 'md:grid-cols-2 md:[direction:rtl] md:*:[direction:ltr]'
      )}
    >
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">{slide.heading}</h2>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{slide.body}</p>
      </div>
      {showVisual && visualBlock}
    </div>
  )
}
