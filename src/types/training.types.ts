export interface ModuleCompletePayload {
  score: number
  passed: boolean
  interactions?: Record<string, unknown>
}

/** Result of recording a finished course attempt (attempt limits, lock state). */
export interface CourseAttemptResult {
  passed: boolean
  attemptsUsed: number
  maxAttempts: number
  locked: boolean
  attemptsRemaining: number
  score: number | null
}
