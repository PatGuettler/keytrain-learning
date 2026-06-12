/** Minimum length for newly set passwords (invite, reset). */
export const MIN_PASSWORD_LENGTH = 10

export const INVALID_LOGIN_MESSAGE = 'Invalid login.'
export const ACCOUNT_LOCKED_MESSAGE =
  'Account locked. Contact your manager or administrator to restore access.'

export function isPasswordLongEnough(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH
}

export function passwordLengthError(): string {
  return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
}
