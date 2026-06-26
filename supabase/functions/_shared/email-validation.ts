const DOMAIN_TYPOS = new Set([
  'gmails.com',
  'gmai.com',
  'gamil.com',
  'gnail.com',
  'gmail.co',
  'gmail.con',
  'yaho.com',
  'yahooo.com',
  'hotmial.com',
  'hotmal.com',
  'outlok.com',
  'outlook.co',
  'icloud.co',
  'bellsouth.ne',
])

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i

export function getEmailValidationError(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return 'Email is required.'
  if (normalized.length > 254) return 'Email is too long.'
  if (!EMAIL_RE.test(normalized)) return `Invalid email "${email.trim()}".`

  const domain = normalized.split('@')[1]
  if (!domain || domain.length < 4) return `Invalid email "${email.trim()}".`
  if (DOMAIN_TYPOS.has(domain)) {
    return `Invalid email domain "${domain}" — check for typos (e.g. gmail.com).`
  }

  const tld = domain.split('.').pop()
  if (!tld || tld.length < 2) return `Invalid email "${email.trim()}".`

  return null
}

export function isValidEmail(email: string): boolean {
  return getEmailValidationError(email) === null
}
