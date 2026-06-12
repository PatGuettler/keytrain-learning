/** True when the user is in the full-screen course player (not the training list). */
export function isTrainingPlayerPath(pathname: string): boolean {
  return pathname.includes('/training/play/')
}
