import { useCallback, useEffect, useRef, useState } from 'react'
import { HEARTBEAT_INTERVAL_MS, SESSION_ACTIVITY_PULSE_EVENT } from '@/lib/constants'
import { completeSession, startSession, updateSessionTime } from '@/services/sessions.service'
import type { TrainingSession } from '@/types/course.types'

export function useTrainingSession(
  assignmentId: string,
  userId: string,
  courseId: string,
  enabled: boolean,
  restartKey = 0
) {
  const [session, setSession] = useState<TrainingSession | null>(null)
  const elapsedRef = useRef(0)
  const sessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    setSession(null)
    sessionIdRef.current = null
    elapsedRef.current = 0
  }, [restartKey])

  useEffect(() => {
    if (!enabled || session) return
    startSession(assignmentId, userId, courseId).then((s) => {
      setSession(s)
      sessionIdRef.current = s.id
    })
  }, [enabled, assignmentId, userId, courseId, session, restartKey])

  useEffect(() => {
    if (!sessionIdRef.current) return
    const interval = setInterval(() => {
      elapsedRef.current += HEARTBEAT_INTERVAL_MS / 1000
      updateSessionTime(sessionIdRef.current!, Math.floor(elapsedRef.current))
      window.dispatchEvent(new Event(SESSION_ACTIVITY_PULSE_EVENT))
    }, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [session?.id])

  const finish = useCallback(
    async (score: number, passed: boolean) => {
      if (!sessionIdRef.current) return
      await completeSession(sessionIdRef.current, {
        score,
        passed,
        time_spent_seconds: Math.floor(elapsedRef.current),
      })
    },
    []
  )

  return { session, finish, elapsedSeconds: elapsedRef }
}
