/**
 * Local persistence of in-progress course player state so a page refresh (or an
 * accidental navigation + return) resumes the attempt instead of restarting it.
 *
 * Scope is intentionally local/best-effort: it stores which modules the learner
 * has already completed within the current attempt, their per-module scores, and
 * the module they were on. It is keyed by assignment + attempts-used so a new
 * attempt (or an admin unlock/retake) never restores stale progress.
 */
export interface ModuleScoreRecord {
  moduleId: string
  title: string
  score: number
  passed: boolean
}

export interface SavedCourseProgress {
  assignmentId: string
  attemptsUsed: number
  currentIndex: number
  completedIndices: number[]
  moduleScores: ModuleScoreRecord[]
  savedAt: number
}

const PREFIX = 'ktl:course-progress'

export function courseProgressKey(userId: string, assignmentId: string): string {
  return `${PREFIX}:${userId}:${assignmentId}`
}

export function loadCourseProgress(key: string): SavedCourseProgress | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedCourseProgress
    if (!parsed || !Array.isArray(parsed.completedIndices)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveCourseProgress(key: string, progress: SavedCourseProgress): void {
  try {
    localStorage.setItem(key, JSON.stringify(progress))
  } catch {
    // Ignore quota / unavailable storage — persistence is best-effort.
  }
}

export function clearCourseProgress(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore.
  }
}
