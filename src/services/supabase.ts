/**
 * Supabase SDK client — import only from backend adapters (e.g. adapters/supabase).
 * Pages, hooks, and components must use services/* instead.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project'))

let client: SupabaseClient<Database> | null = null

export function getSupabaseUrl(): string | null {
  return isSupabaseConfigured ? url! : null
}

export function getSupabaseAnonKey(): string | null {
  return isSupabaseConfigured ? anonKey! : null
}

export function getSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient<Database>(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
