const MAX_ROWS = 500
const VALID_ROLES = new Set(['admin', 'manager', 'employee'])
const DEFAULT_ROLE = 'employee'

export interface CsvUserImportRow {
  email: string
  full_name: string
  role: string
  manager_email: string
  line: number
}

function deriveName(email: string): string {
  const local = email.split('@')[0] ?? email
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field.trim())
      field = ''
    } else if (c === '\n' || (c === '\r' && next === '\n')) {
      row.push(field.trim())
      if (row.some((f) => f.length > 0)) rows.push(row)
      row = []
      field = ''
      if (c === '\r') i++
    } else {
      field += c
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim())
    if (row.some((f) => f.length > 0)) rows.push(row)
  }

  return rows
}

export function parseUserImportCsv(csv: string): { rows: CsvUserImportRow[]; error?: string } {
  const table = parseCsv(csv.trim())
  if (table.length < 2) {
    return { rows: [], error: 'CSV must include a header row and at least one user row.' }
  }

  const header = table[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'))
  const emailIdx = header.indexOf('email')
  const nameIdx = header.indexOf('full_name')
  const roleIdx = header.indexOf('role')
  const managerIdx = header.indexOf('manager_email')

  if (emailIdx === -1) {
    return { rows: [], error: 'CSV must include an email column.' }
  }

  const rows: CsvUserImportRow[] = []
  for (let i = 1; i < table.length; i++) {
    const line = table[i]
    const email = (line[emailIdx] ?? '').toLowerCase().trim()
    if (!email) continue

    const rawName = nameIdx >= 0 ? (line[nameIdx] ?? '').trim() : ''
    const rawRole = roleIdx >= 0 ? (line[roleIdx] ?? '').toLowerCase().trim() : ''

    rows.push({
      email,
      full_name: rawName || deriveName(email),
      role: rawRole || DEFAULT_ROLE,
      manager_email: managerIdx >= 0 ? (line[managerIdx] ?? '').toLowerCase().trim() : '',
      line: i + 1,
    })
  }

  if (rows.length === 0) {
    return { rows: [], error: 'No user rows found in CSV.' }
  }
  if (rows.length > MAX_ROWS) {
    return {
      rows: [],
      error: `CSV has ${rows.length} rows. Maximum per upload is ${MAX_ROWS}. Split into smaller files.`,
    }
  }

  const validationError = validateUserImportRows(rows)
  if (validationError) {
    return { rows: [], error: validationError }
  }

  return { rows }
}

export function validateUserImportRows(rows: CsvUserImportRow[]): string | null {
  const emails = new Set<string>()

  for (const row of rows) {
    if (!VALID_ROLES.has(row.role)) {
      return `Line ${row.line}: role must be manager or employee (defaults to employee if omitted).`
    }
    if (row.role === 'admin') {
      return `Line ${row.line}: platform admins cannot be added to an organization via CSV.`
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      return `Line ${row.line}: invalid email "${row.email}".`
    }
    if (emails.has(row.email)) return `Duplicate email in CSV: ${row.email}`
    emails.add(row.email)

    if (
      row.role === 'employee' &&
      row.manager_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.manager_email)
    ) {
      return `Line ${row.line}: invalid manager_email.`
    }
    if (row.role !== 'employee' && row.manager_email) {
      return `Line ${row.line}: manager_email should only be set for employees.`
    }
  }

  return null
}
