import { useEffect, useRef } from 'react'
import { SESSION_ACTIVITY_PULSE_EVENT } from '@/lib/constants'

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'] as const
const MOUSEMOVE_THROTTLE_MS = 1_000

export function useIdleTimeout({
  enabled,
  timeoutMs,
  onIdle,
}: {
  enabled: boolean
  timeoutMs: number
  onIdle: () => void | Promise<void>
}) {
  const lastActivityRef = useRef(Date.now())
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onIdleRef = useRef(onIdle)
  const firedRef = useRef(false)
  const lastMousemoveRef = useRef(0)

  onIdleRef.current = onIdle

  useEffect(() => {
    if (!enabled) return

    firedRef.current = false
    lastActivityRef.current = Date.now()

    const clearScheduled = () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }
    }

    const triggerIdle = () => {
      if (firedRef.current) return
      firedRef.current = true
      clearScheduled()
      void onIdleRef.current()
    }

    const checkIdle = () => {
      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        triggerIdle()
        return true
      }
      return false
    }

    const scheduleIdle = () => {
      clearScheduled()
      const remaining = timeoutMs - (Date.now() - lastActivityRef.current)
      timeoutIdRef.current = setTimeout(checkIdle, Math.max(remaining, 0))
    }

    const markActive = () => {
      if (firedRef.current) return
      lastActivityRef.current = Date.now()
      scheduleIdle()
    }

    const onMouseMove = () => {
      const now = Date.now()
      if (now - lastMousemoveRef.current < MOUSEMOVE_THROTTLE_MS) return
      lastMousemoveRef.current = now
      markActive()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (checkIdle()) return
      scheduleIdle()
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true })
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener(SESSION_ACTIVITY_PULSE_EVENT, markActive)
    document.addEventListener('visibilitychange', onVisibilityChange)

    scheduleIdle()

    return () => {
      clearScheduled()
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive)
      }
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener(SESSION_ACTIVITY_PULSE_EVENT, markActive)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, timeoutMs])
}
