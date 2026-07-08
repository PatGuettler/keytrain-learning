import { FileText } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { LessonContent, LessonSlide } from '@/types/course.types'
import { cn } from '@/lib/utils'
import { LessonIllustration, resolveIllustrationKey } from './lesson-illustrations'
import { SlideBodyContent } from './SlideBodyContent'
import { SlideVideoPlayer } from './SlideVideoPlayer'
import { resolveSlideVideo, slideRequiresVideo } from '@/lib/video'
import { ZoomableSlideImage } from './ZoomableSlideImage'

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
  const layout = slide?.layout ?? 'content-only'
  const isLast = slides.length === 0 || safeIndex >= slides.length - 1
  const requiresVideo = slide ? slideRequiresVideo(slide) : false
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
              (layout === 'full-bleed' || layout === 'image-only') && 'bg-primary/5'
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
  const illustrationKey = resolveIllustrationKey(illustration?.key)
  const alt = illustration?.alt?.trim() || slide.heading?.trim() || 'Slide image'
  const layout = slide.layout ?? 'content-only'
  const hasIllustration = Boolean(imageUrl) || Boolean(illustrationKey)
  const headingText = slide.heading?.trim() ?? ''
  const bodyText = slide.body?.trim() ?? ''
  const hasText = Boolean(headingText || bodyText)

  // Only show an image column when the author actually attached imagery.
  // Never invent a default illustration or empty "No image" placeholder.
  const showVisual =
    hasIllustration &&
    layout !== 'content-only' &&
    (layout === 'image-right' ||
      layout === 'image-left' ||
      layout === 'image-top' ||
      layout === 'full-bleed' ||
      layout === 'image-only')

  const imageOnly = layout === 'image-only'

  const visualBlock = showVisual ? (
    <figure className="rounded-lg border bg-muted/50 min-w-0 w-full">
      {imageUrl ? (
        <ZoomableSlideImage src={imageUrl} alt={alt} imageOnly={imageOnly} />
      ) : illustrationKey ? (
        <LessonIllustration illustrationKey={illustrationKey} alt={alt} className="w-full" />
      ) : null}
      {illustration?.caption?.trim() && (
        <figcaption className="text-xs text-muted-foreground px-3 py-2 border-t bg-card text-center">
          {illustration.caption}
        </figcaption>
      )}
    </figure>
  ) : null

  const textBlock = hasText ? (
    <div className="min-w-0">
      {headingText ? (
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 break-anywhere leading-snug">
          {headingText}
        </h2>
      ) : null}
      {bodyText ? <SlideBodyContent body={slide.body} className="min-w-0" /> : null}
    </div>
  ) : null

  const slideVideo = resolveSlideVideo(slide)

  const videoBlock = slideVideo ? (
    <SlideVideoPlayer video={slideVideo} onWatched={onVideoWatched} />
  ) : null

  const pdfBlock = slide.pdf?.url ? (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate">{slide.pdf.fileName || 'PDF document'}</span>
      </div>
      <div className="w-full overflow-hidden rounded-md border bg-background">
        <iframe
          title={slide.pdf.fileName || 'PDF document'}
          src={slide.pdf.url}
          className="w-full h-[min(70vh,32rem)]"
        />
      </div>
      <a
        href={slide.pdf.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-sm text-primary hover:underline"
      >
        Open / download PDF
      </a>
    </div>
  ) : null

  if (imageOnly) {
    return (
      <div className="space-y-4 min-w-0">
        {visualBlock}
        {pdfBlock}
      </div>
    )
  }

  if (layout === 'content-only' || (!showVisual && (videoBlock || pdfBlock || hasText))) {
    return (
      <div className="space-y-4 sm:space-y-6 min-w-0">
        {textBlock}
        {videoBlock}
        {pdfBlock}
      </div>
    )
  }

  if (layout === 'full-bleed' || layout === 'image-top') {
    return (
      <div className="space-y-4 sm:space-y-6 min-w-0">
        {textBlock}
        {videoBlock}
        {pdfBlock}
        {visualBlock}
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
      <div className="min-w-0 space-y-4">
        {textBlock}
        {videoBlock}
        {pdfBlock}
      </div>
      {visualBlock && <div className="min-w-0">{visualBlock}</div>}
    </div>
  )
}
