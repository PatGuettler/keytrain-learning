/** Marketing contact / mailto recipients (comma-separated for mailto:). */
export const SUPPORT_INBOX_EMAILS = [
  'patguettlerkt@outlook.com',
  'austinhosekt@outlook.com',
  'austinryalskt@outlook.com',
] as const

/** Comma-separated for mailto: and single-line display. */
export const SUPPORT_INBOX_EMAIL = SUPPORT_INBOX_EMAILS.join(',')
