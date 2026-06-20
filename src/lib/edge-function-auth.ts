import { getSupabase } from '@/services/supabase'

const SESSION_EXPIRED =
  'Your session expired. Please sign out and sign in again, then retry.'

/**
 * Returns a fresh access token for Edge Function calls.
 * Uses getUser() so an expired access token is refreshed before the request.
 */
export async function getEdgeFunctionAccessToken(): Promise<string> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend is not configured.')

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw new Error(SESSION_EXPIRED)

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) throw new Error(SESSION_EXPIRED)

  return session.access_token
}
