/** Detect Supabase recovery/invite tokens in the current URL (hash or query). */
export function getAuthCallbackSignals(): {
  hasTokens: boolean
  hasError: boolean
} {
  if (typeof window === 'undefined') {
    return { hasTokens: false, hasError: false }
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const searchParams = new URLSearchParams(window.location.search)

  const hasTokens =
    hashParams.get('type') === 'recovery' ||
    hashParams.get('type') === 'invite' ||
    hashParams.get('type') === 'signup' ||
    Boolean(hashParams.get('access_token')) ||
    searchParams.has('code') ||
    searchParams.has('token_hash')

  const hasError = hashParams.has('error') || searchParams.has('error')

  return { hasTokens, hasError }
}
