import { getSupabase } from '@/services/supabase'

const SESSION_EXPIRED =
  'Your session expired. Please sign out and sign in again, then retry.'

/**
 * Returns a fresh access token for Edge Function calls.
 * Prefers refreshSession over getUser to avoid intermittent 422s after password reset.
 */
export async function getEdgeFunctionAccessToken(): Promise<string> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend is not configured.')

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) throw new Error(SESSION_EXPIRED)

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  const accessToken = refreshed.session?.access_token ?? session.access_token
  if (refreshError && !accessToken) throw new Error(SESSION_EXPIRED)

  return accessToken
}
