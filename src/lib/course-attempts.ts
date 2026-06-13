/** Format attempt counts for display (0 max = unlimited). */
export function isUnlimitedAttempts(maxAttempts: number | null | undefined): boolean {
  return maxAttempts === 0
}

export function formatMaxAttempts(maxAttempts: number | null | undefined): string {
  return isUnlimitedAttempts(maxAttempts) ? 'Unlimited' : String(maxAttempts ?? 3)
}

export function formatAttemptsLabel(used: number, maxAttempts: number | null | undefined): string {
  if (isUnlimitedAttempts(maxAttempts)) return `${used} (unlimited)`
  return `${used}/${maxAttempts ?? 3}`
}
