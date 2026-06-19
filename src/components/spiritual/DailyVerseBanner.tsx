import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DailyVerseBannerProps = {
  reference: string
  text: string
  onDismiss: () => void
}

export function DailyVerseBanner({ reference, text, onDismiss }: DailyVerseBannerProps) {
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    setDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    const delta = startY.current - e.touches[0].clientY
    setDragY(Math.max(0, delta))
  }

  const handleTouchEnd = () => {
    if (dragY > 60) {
      onDismiss()
    } else {
      setDragY(0)
    }
    setDragging(false)
  }

  return (
    <div
      className={cn(
        'relative z-30 border-b bg-primary/10 px-3 py-3 sm:px-4 transition-transform duration-200',
        dragging && 'transition-none'
      )}
      style={{ transform: dragY > 0 ? `translateY(-${dragY}px)` : undefined, opacity: dragY > 0 ? 1 - dragY / 120 : 1 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Daily Bible verse"
    >
      <div className="mx-auto flex max-w-7xl gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Daily Bible Verse</p>
          <p className="text-sm font-medium">{reference}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{text}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onDismiss}
          aria-label="Dismiss daily verse"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
