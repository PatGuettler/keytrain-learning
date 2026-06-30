import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Minus, Plus, RotateCcw, X, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MIN_SCALE = 1
const MAX_SCALE = 4
const SCALE_STEP = 0.5

type ZoomableSlideImageProps = {
  src: string
  alt: string
  className?: string
  imageOnly?: boolean
}

export function ZoomableSlideImage({
  src,
  alt,
  className,
  imageOnly = false,
}: ZoomableSlideImageProps) {
  const [open, setOpen] = useState(false)
  const [scale, setScale] = useState(1)

  const openLightbox = useCallback(() => {
    setScale(1)
    setOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setOpen(false)
    setScale(1)
  }, [])

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, Math.round((s + SCALE_STEP) * 10) / 10))
  }, [])

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, Math.round((s - SCALE_STEP) * 10) / 10))
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === '+' || e.key === '=') zoomIn()
      if (e.key === '-') zoomOut()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, closeLightbox, zoomIn, zoomOut])

  const lightbox =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex flex-col bg-black/95"
            role="dialog"
            aria-modal="true"
            aria-label={`Enlarged view: ${alt}`}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 safe-area-pt">
              <p className="truncate text-sm text-white/90 flex-1">{alt}</p>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-white/10"
                  onClick={zoomOut}
                  disabled={scale <= MIN_SCALE}
                  aria-label="Zoom out"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[3rem] text-center text-xs tabular-nums text-white/80">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-white/10"
                  onClick={zoomIn}
                  disabled={scale >= MAX_SCALE}
                  aria-label="Zoom in"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-white/10"
                  onClick={() => setScale(1)}
                  aria-label="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-white/10"
                  onClick={closeLightbox}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto overscroll-contain p-3 sm:p-6 touch-pan-x touch-pan-y">
              <div className="mx-auto min-w-min w-max max-w-none">
                <img
                  src={src}
                  alt={alt}
                  draggable={false}
                  className="block max-w-none select-none"
                  style={{ width: `${scale * 100}vw`, maxWidth: `${scale * 1200}px` }}
                />
              </div>
            </div>

            <p className="shrink-0 border-t border-white/10 px-4 py-2 text-center text-xs text-white/60 safe-area-pb">
              Pinch or scroll to pan · Use +/− to zoom · Press Esc to close
            </p>
          </div>,
          document.body
        )
      : null

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={openLightbox}
        className="group relative block w-full cursor-zoom-in touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Enlarge image: ${alt}`}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={cn(
            'w-full h-auto object-contain bg-white dark:bg-white',
            imageOnly ? 'max-h-[min(70vh,720px)]' : 'max-h-64 sm:max-h-80',
            className
          )}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs font-medium text-white sm:opacity-90">
          <ZoomIn className="h-4 w-4 shrink-0" />
          Tap or click to enlarge
        </span>
      </button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 w-full touch-manipulation"
        onClick={openLightbox}
      >
        <ZoomIn className="h-4 w-4 mr-2" />
        Enlarge image
      </Button>

      {lightbox}
    </div>
  )
}
