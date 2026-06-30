import { useEffect, useRef, useState } from 'react'

export function LoomPlayer({
  loomId,
  onWatched,
}: {
  loomId: string
  onWatched: () => void
}) {
  const watchedRef = useRef(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    watchedRef.current = false

    const markWatched = () => {
      if (watchedRef.current) return
      watchedRef.current = true
      onWatched()
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.loom.com') return
      const data = event.data
      if (!data || typeof data !== 'object') return
      const type = (data as { type?: string; event?: string }).type
      const eventName = (data as { event?: string }).event
      if (
        type === 'embed:video:ended' ||
        type === 'video-ended' ||
        eventName === 'ended'
      ) {
        markWatched()
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [loomId, onWatched])

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
      <iframe
        src={`https://www.loom.com/embed/${loomId}?hide_owner=true&hide_share=true&hide_title=true`}
        title="Course video"
        className="h-full w-full"
        allowFullScreen
        onError={() => setLoadError(true)}
      />
      {loadError && (
        <p className="text-sm text-destructive mt-2">
          Could not load this Loom video. Check the link in the course builder.
        </p>
      )}
    </div>
  )
}
