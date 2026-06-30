import { useEffect, useId, useRef, useState } from 'react'

declare global {
  interface Window {
    Vimeo?: {
      Player: new (
        element: HTMLIFrameElement,
        options?: { id?: string; url?: string }
      ) => VimeoPlayerInstance
    }
  }
}

interface VimeoPlayerInstance {
  on(event: 'ended' | 'timeupdate', handler: (data?: { percent?: number }) => void): void
  destroy(): void
}

let vimeoApiPromise: Promise<void> | null = null

function loadVimeoPlayerApi(): Promise<void> {
  if (window.Vimeo?.Player) return Promise.resolve()
  if (vimeoApiPromise) return vimeoApiPromise

  vimeoApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-vimeo-player-api]')
    if (existing) {
      if (window.Vimeo?.Player) resolve()
      else existing.addEventListener('load', () => resolve())
      return
    }

    const script = document.createElement('script')
    script.src = 'https://player.vimeo.com/api/player.js'
    script.async = true
    script.dataset.vimeoPlayerApi = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Vimeo player failed to load'))
    document.body.appendChild(script)
  })

  return vimeoApiPromise
}

export function VimeoPlayer({
  vimeoId,
  onWatched,
}: {
  vimeoId: string
  onWatched: () => void
}) {
  const iframeId = useId().replace(/:/g, '')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<VimeoPlayerInstance | null>(null)
  const watchedRef = useRef(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    watchedRef.current = false
    setLoadError(false)
    let cancelled = false

    const markWatched = () => {
      if (watchedRef.current) return
      watchedRef.current = true
      onWatched()
    }

    void loadVimeoPlayerApi()
      .then(() => {
        if (cancelled || !iframeRef.current || !window.Vimeo?.Player) {
          setLoadError(true)
          return
        }

        playerRef.current?.destroy()
        const player = new window.Vimeo.Player(iframeRef.current, { id: vimeoId })
        playerRef.current = player
        player.on('ended', markWatched)
        player.on('timeupdate', (data) => {
          if ((data?.percent ?? 0) >= 0.95) markWatched()
        })
      })
      .catch(() => setLoadError(true))

    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [iframeId, onWatched, vimeoId])

  if (loadError) {
    return (
      <p className="text-sm text-destructive">
        Could not load this Vimeo video. Check the link in the course builder.
      </p>
    )
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
      <iframe
        ref={iframeRef}
        id={iframeId}
        src={`https://player.vimeo.com/video/${vimeoId}?dnt=1`}
        title="Course video"
        className="h-full w-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
