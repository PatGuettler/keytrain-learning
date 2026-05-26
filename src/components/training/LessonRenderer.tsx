import { useState } from 'react'
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
  const [index, setIndex] = useState(0)
  const slide = content.slides[index]
  const isLast = index >= content.slides.length - 1

  const next = () => {
    if (isLast) onComplete()
    else setIndex((i) => i + 1)
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
          Slide {index + 1} of {content.slides.length}
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
  const showVisual =
    Boolean(imageUrl) ||
    Boolean(illustration?.key) ||
    slide.layout === 'image-right' ||
    slide.layout === 'image-left' ||
    slide.layout === 'image-top' ||
    (slide.layout === 'full-bleed' && illustration !== undefined)

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

  if (slide.layout === 'full-bleed') {
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

  if (slide.layout === 'image-top') {
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
        showVisual && slide.layout === 'image-right' && 'md:grid-cols-2',
        showVisual && slide.layout === 'image-left' && 'md:grid-cols-2 md:[direction:rtl] md:*:[direction:ltr]'
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
