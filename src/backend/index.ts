import { createBackend } from './createBackend'

/**
 * Single backend instance used across the app.
 *
 * Switching providers (supabase → aws/rest) only requires:
 * - implementing `Backend` in `adapters/<provider>/`
 * - wiring the adapter in `createBackend.ts`
 * - setting `VITE_BACKEND=<provider>`
 *
 * UI code must use `services/*` — never adapters or `services/supabase.ts`.
 */
export const backend = createBackend()

export function isBackendReady(): boolean {
  return backend.kind !== 'unconfigured'
}

export function getBackendKind(): string {
  return backend.kind
}

export type { Backend } from './types'

