import { createBackend } from './createBackend'

/**
 * Single backend instance used across the app.
 *
 * Switching providers (demo/supabase/aws) should only require:
 * - adding a new adapter inside `createBackend()`
 * - setting `VITE_BACKEND=aws` (or similar)
 */
export const backend = createBackend()

export type { Backend } from './types'

