const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Normalize user input: uppercase, strip spaces/dashes for lookup. */
export function normalizeJoinCodeInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Display format XXXX-XXXX-XXXX */
export function formatJoinCode(raw: string): string {
  const compact = normalizeJoinCodeInput(raw)
  if (compact.length !== 12) return compact
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`
}

export function generateJoinCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  let compact = ''
  for (let i = 0; i < 12; i++) {
    compact += JOIN_CODE_CHARS[bytes[i] % JOIN_CODE_CHARS.length]
  }
  return formatJoinCode(compact)
}

export function joinCodeMatches(stored: string, input: string): boolean {
  return normalizeJoinCodeInput(stored) === normalizeJoinCodeInput(input)
}
