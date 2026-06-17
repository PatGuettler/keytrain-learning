/** Shown when no backend adapter is configured (provider-agnostic). */
export const BACKEND_NOT_CONFIGURED_MESSAGE =
  'Application backend is not configured. Set the required API environment variables in your .env file and restart the dev server.'

/** Public app URL for auth email links (must match Supabase → Auth → Redirect URLs). */
export function getPublicAppUrl(): string {
  const envUrl = import.meta.env.VITE_APP_URL as string | undefined
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl
  }
  if (typeof window !== 'undefined') {
    const { origin, pathname } = window.location
    const repoBase = pathname.startsWith('/guardian-md')
      ? `${origin}/guardian-md`
      : origin
    return repoBase
  }
  return 'https://keytrainlearning.com'
}

export function getResetPasswordRedirectUrl(): string {
  return `${getPublicAppUrl()}/reset-password`
}

export function getInviteRedirectUrl(): string {
  return `${getPublicAppUrl()}/accept-invite`
}
