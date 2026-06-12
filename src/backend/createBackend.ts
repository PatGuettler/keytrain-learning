import { isSupabaseConfigured } from '@/services/supabase'
import { createSupabaseBackend } from './adapters/supabase/backend'
import { createUnconfiguredBackend } from './adapters/unconfigured'
import type { Backend } from './types'

/**
 * Selects the active backend adapter from VITE_BACKEND / environment.
 * UI code must use services/* — never import adapters or the Supabase client directly.
 */
export function createBackend(): Backend {
  const forced = (import.meta.env.VITE_BACKEND as string | undefined)?.toLowerCase()
  if (forced === 'demo') {
    throw new Error('Demo mode has been removed. Configure a backend adapter and set VITE_BACKEND.')
  }
  if (forced === 'aws') {
    throw new Error(
      'AWS backend is not implemented yet. Add src/backend/adapters/aws and set VITE_BACKEND=aws.'
    )
  }
  if (forced === 'supabase' || isSupabaseConfigured) return createSupabaseBackend()
  return createUnconfiguredBackend()
}
