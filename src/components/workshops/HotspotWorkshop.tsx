import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WorkshopContent, HotspotConfig } from '@/types/workshop.types'

export function HotspotWorkshop({
  content,
  onComplete,
}: {
  content: WorkshopContent
  onComplete: () => void
}) {
  const config = content.config as HotspotConfig
  const [clicks, setClicks] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (submitted) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    config.regions.forEach((r) => {
      const xs = r.points.map((p) => p.x)
      const ys = r.points.map((p) => p.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        setClicks((prev) => new Set(prev).add(r.id))
      }
    })
  }

  const submit = () => {
    setSubmitted(true)
    const incidents = config.regions.filter((r) => r.is_incident)
    const found = incidents.every((r) => clicks.has(r.id))
    if (found) onComplete()
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">{content.instructions}</p>
      <div
        className="relative aspect-video rounded-lg border bg-muted cursor-crosshair overflow-hidden"
        onClick={handleImageClick}
      >
        {config.background_image ? (
          <img src={config.background_image} alt="" className="w-full h-full object-cover pointer-events-none" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Click areas that represent reportable incidents
          </div>
        )}
        {submitted &&
          config.regions.map((r) => {
            const xs = r.points.map((p) => p.x)
            const ys = r.points.map((p) => p.y)
            const clicked = clicks.has(r.id)
            const color =
              r.is_incident && clicked
                ? 'border-emerald-500 bg-emerald-500/20'
                : r.is_incident && !clicked
                  ? 'border-destructive bg-destructive/20'
                  : !r.is_incident && clicked
                    ? 'border-amber-500 bg-amber-500/20'
                    : 'border-transparent'
            return (
              <div
                key={r.id}
                className={cn('absolute border-2', color)}
                style={{
                  left: `${Math.min(...xs)}%`,
                  top: `${Math.min(...ys)}%`,
                  width: `${Math.max(...xs) - Math.min(...xs)}%`,
                  height: `${Math.max(...ys) - Math.min(...ys)}%`,
                }}
              />
            )
          })}
      </div>
      <p className="text-sm">Selected: {clicks.size} area(s)</p>
      <Button onClick={submit}>Submit Answers</Button>
    </div>
  )
}
