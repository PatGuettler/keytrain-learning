export interface ModuleCompletePayload {
  score: number
  passed: boolean
  interactions?: Record<string, unknown>
}
