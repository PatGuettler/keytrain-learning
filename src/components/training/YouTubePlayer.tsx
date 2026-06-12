import { useEffect, useId, useRef, useState } from 'react'

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string
          playerVars?: Record<string, string | number>
          events?: {
            onReady?: (event: { target: YtPlayer }) => void
            onStateChange?: (event: { data: number; target: YtPlayer }) => void
          }
        }
      ) => YtPlayer
      PlayerState: {
        ENDED: number
        PLAYING: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface YtPlayer {
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
}

let youtubeApiPromise: Promise<void> | null = null

function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-youtube-iframe-api]')
    if (existing) {
      if (window.YT?.Player) resolve()
      else window.onYouTubeIframeAPIReady = () => resolve()
      return
    }

    window.onYouTubeIframeAPIReady = () => resolve()
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.dataset.youtubeIframeApi = 'true'
    document.body.appendChild(script)
  })

  return youtubeApiPromise
}

export function YouTubePlayer({
  videoId,
  onWatched,
}: {
  videoId: string
  onWatched: () => void
}) {
  const elementId = useId().replace(/:/g, '')
  const playerRef = useRef<YtPlayer | null>(null)
  const watchedRef = useRef(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    watchedRef.current = false
    setLoadError(false)
    let intervalId: number | undefined
    let cancelled = false

    const markWatched = () => {
      if (watchedRef.current) return
      watchedRef.current = true
      onWatched()
    }

    void loadYouTubeIframeApi()
      .then(() => {
        if (cancelled || !window.YT?.Player) {
          setLoadError(true)
          return
        }

        playerRef.current?.destroy()
        playerRef.current = new window.YT.Player(elementId, {
          videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              intervalId = window.setInterval(() => {
                try {
                  const duration = event.target.getDuration()
                  const current = event.target.getCurrentTime()
                  if (duration > 0 && current / duration >= 0.95) {
                    markWatched()
                  }
                } catch {
                  /* player not ready */
                }
              }, 1000)
            },
            onStateChange: (event) => {
              if (event.data === window.YT!.PlayerState.ENDED) {
                markWatched()
              }
            },
          },
        })
      })
      .catch(() => setLoadError(true))

    return () => {
      cancelled = true
      if (intervalId) window.clearInterval(intervalId)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [elementId, onWatched, videoId])

  if (loadError) {
    return (
      <p className="text-sm text-destructive">
        Could not load this video. Check the YouTube link in the course builder.
      </p>
    )
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
      <div id={elementId} className="h-full w-full" title="Course video" />
    </div>
  )
}
