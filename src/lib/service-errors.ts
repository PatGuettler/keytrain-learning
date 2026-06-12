export const SAVE_COURSE_RESULT_ERROR =
  'Could not save your course result. Please try again or contact your administrator.'

export function toServiceErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
