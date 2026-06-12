import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { LessonContent, LessonSlide } from '@/types/course.types'
import { cn } from '@/lib/utils'
import { LessonIllustration, resolveIllustrationKey } from './lesson-illustrations'
import { YouTubePlayer } from './YouTubePlayer'

export function LessonRenderer({
  moduleId,
  content,
  onComplete,
}: {
  moduleId: string
  content: LessonContent
  onComplete: () => void
}) {
  const slides = useMemo(
    () => (Array.isArray(content.slides) ? content.slides.filter(Boolean) : []),
    [content.slides]
  )
  const [index, setIndex] = useState(0)
  const [videoWatched, setVideoWatched] = useState(false)

  useEffect(() => {
    setIndex(0)
    setVideoWatched(false)
  }, [moduleId])

  useEffect(() => {
    setVideoWatched(false)
  }, [index])

  const safeIndex = slides.length > 0 ? Math.min(index, slides.length - 1) : 0
  const slide: LessonSlide | undefined = slides[safeIndex]
  const layout = slide?.layout ?? 'image-right'
  const isLast = slides.length === 0 || safeIndex >= slides.length - 1
  const requiresVideo = Boolean(slide?.youtube?.videoId)
  const canAdvance = !requiresVideo || videoWatched

  const handleVideoWatched = useCallback(() => {
    setVideoWatched(true)
  }, [])

  const next = () => {
    if (!canAdvance) return
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
    return (
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <p className="text-muted-foreground">Unable to load this slide.</p>
        <Button onClick={() => setIndex(0)} className="min-h-11">
          Restart lesson
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 min-w-0 w-full max-w-full overflow-hidden">
      <div className="overflow-hidden rounded-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${moduleId}-${slide.id}-${safeIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'rounded-lg border bg-card p-4 sm:p-6 min-w-0',
              layout === 'full-bleed' && 'bg-primary/5'
            )}
          >
            <SlideView slide={slide} onVideoWatched={handleVideoWatched} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center text-sm text-muted-foreground pt-1">
        <span className="text-center sm:text-left">
          Slide {safeIndex + 1} of {slides.length}
          {requiresVideo && !videoWatched && ' · Watch the full video to continue'}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 sm:flex-none sm:min-w-[7rem]"
            disabled={safeIndex === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </Button>
          <Button
            onClick={next}
            disabled={!canAdvance}
            className="min-h-11 flex-1 sm:flex-none sm:min-w-[9rem]"
          >
            {isLast ? 'Complete lesson' : 'Next slide'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SlideView({
  slide,
  onVideoWatched,
}: {
  slide: LessonSlide
  onVideoWatched: () => void
}) {
  const illustration = slide.illustration
  const imageUrl = illustration?.url?.trim()
  const illustrationKey = resolveIllustrationKey(illustration?.key, slide.heading)
  const alt = illustration?.alt ?? slide.heading
  const layout = slide.layout ?? 'image-right'
  const hasIllustration = Boolean(imageUrl) || Boolean(illustration?.key)
  const showVisual =
    hasIllustration ||
    layout === 'image-top' ||
    (layout === 'full-bleed' && illustration !== undefined)

  const prose = 'text-muted-foreground leading-relaxed whitespace-pre-wrap break-anywhere min-w-0'

  const visualBlock = (
    <figure className="rounded-lg overflow-hidden border bg-muted/50 min-w-0 w-full">
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

  const heading = 'text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 break-anywhere leading-snug'

  if (layout === 'full-bleed') {
    return (
      <div className="space-y-4 sm:space-y-6 min-w-0">
        {slide.youtube?.videoId && (
          <YouTubePlayer videoId={slide.youtube.videoId} onWatched={onVideoWatched} />
        )}
        {showVisual && visualBlock}
        <div className="min-w-0">
          <h2 className={heading}>{slide.heading}</h2>
          <p className={prose}>{slide.body}</p>
        </div>
      </div>
    )
  }

  if (layout === 'image-top') {
    return (
      <div className="space-y-4 sm:space-y-6 min-w-0">
        {slide.youtube?.videoId && (
          <YouTubePlayer videoId={slide.youtube.videoId} onWatched={onVideoWatched} />
        )}
        {showVisual && visualBlock}
        <div className="min-w-0">
          <h2 className={heading}>{slide.heading}</h2>
          <p className={prose}>{slide.body}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-4 sm:gap-6 min-w-0',
        showVisual && layout === 'image-right' && 'md:grid-cols-2',
        showVisual && layout === 'image-left' && 'md:grid-cols-2 md:[direction:rtl] md:*:[direction:ltr]'
      )}
    >
      <div className="min-w-0 order-2 md:order-none space-y-4">
        {slide.youtube?.videoId && (
          <YouTubePlayer videoId={slide.youtube.videoId} onWatched={onVideoWatched} />
        )}
        <div>
          <h2 className={heading}>{slide.heading}</h2>
          <p className={prose}>{slide.body}</p>
        </div>
      </div>
      {showVisual && <div className="min-w-0 order-1 md:order-none">{visualBlock}</div>}
    </div>
  )
}
