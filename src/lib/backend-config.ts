import { absoluteAppUrl } from '@/lib/paths'

/** Shown when no backend adapter is configured (provider-agnostic). */
export const BACKEND_NOT_CONFIGURED_MESSAGE =
  'Application backend is not configured. Set the required API environment variables in your .env file and restart the dev server.'

export function getResetPasswordRedirectUrl(): string {
  return absoluteAppUrl('reset-password')
}
