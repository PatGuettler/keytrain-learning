import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { LessonContent, LessonSlide } from '@/types/course.types'
import { cn } from '@/lib/utils'

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
            'rounded-lg border bg-card p-6',
            slide.layout === 'full-bleed' && 'bg-primary/5'
          )}
        >
          <SlideView slide={slide} />
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>
          Slide {index + 1} of {content.slides.length}
        </span>
        <Button onClick={next}>{isLast ? 'Complete Lesson' : 'Next Slide'}</Button>
      </div>
    </div>
  )
}

function SlideView({ slide }: { slide: LessonSlide }) {
  const hasImage = slide.illustration?.url
  return (
    <div
      className={cn(
        'grid gap-6',
        slide.layout === 'image-right' && 'md:grid-cols-2',
        slide.layout === 'image-left' && 'md:grid-cols-2 md:[direction:rtl] md:*:[direction:ltr]'
      )}
    >
      <div>
        <h2 className="text-2xl font-bold mb-4">{slide.heading}</h2>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{slide.body}</p>
      </div>
      {(hasImage || slide.layout?.includes('image')) && (
        <div className="rounded-lg bg-muted flex items-center justify-center min-h-[160px] p-4">
          {hasImage ? (
            <img src={slide.illustration!.url} alt={slide.illustration!.alt} className="max-h-48 rounded" />
          ) : (
            <p className="text-sm text-muted-foreground text-center">{slide.illustration?.alt ?? 'Illustration'}</p>
          )}
        </div>
      )}
    </div>
  )
}
