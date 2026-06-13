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

export const PASSWORD_CRITERIA_HINT = passwordLengthError()

export const PASSWORD_UPGRADE_MESSAGE =
  'Your password does not meet our security requirements. Choose a new password with at least 10 characters to continue.'

/** Shown on login when the entered password is too short (does not confirm whether the account exists). */
export const LOGIN_SHORT_PASSWORD_HINT =
  'This password is too short. Use Forgot password to set a new password that meets the 10-character minimum.'
