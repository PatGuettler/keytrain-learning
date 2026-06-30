import { useState } from 'react'
import { ZoomIn } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        aria-label={`Zoom in on ${alt}`}
      >
        <img
          src={src}
          alt={alt}
          className={cn(
            'w-full h-auto object-contain transition-opacity group-hover:opacity-95',
            imageOnly ? 'max-h-[min(70vh,720px)]' : 'max-h-64',
            className
          )}
        />
        <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ZoomIn className="h-3.5 w-3.5" />
          Click to zoom
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(96vw,1200px)] w-full p-2 sm:p-4 bg-card border-border">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <DialogDescription className="sr-only">Enlarged view of the slide image</DialogDescription>
          <div className="flex max-h-[85dvh] items-center justify-center overflow-auto pt-6">
            <img
              src={src}
              alt={alt}
              className="max-h-[80dvh] w-auto max-w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
