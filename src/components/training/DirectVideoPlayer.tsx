import { useEffect, useRef } from 'react'

export function DirectVideoPlayer({
  url,
  onWatched,
}: {
  url: string
  onWatched: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const watchedRef = useRef(false)

  useEffect(() => {
    watchedRef.current = false
  }, [url])

  const markWatched = () => {
    if (watchedRef.current) return
    watchedRef.current = true
    onWatched()
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full"
        title="Course video"
        onEnded={markWatched}
        onTimeUpdate={() => {
          const el = videoRef.current
          if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return
          if (el.currentTime / el.duration >= 0.95) markWatched()
        }}
      >
        Your browser does not support embedded video.
      </video>
    </div>
  )
}
