import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const MAX_ROWS = 500
const ROLE_ORDER: Record<string, number> = { admin: 0, manager: 1, employee: 2 }
const VALID_ROLES = new Set(['admin', 'manager', 'employee'])
const DEFAULT_ROLE = 'employee'
const PLATFORM_ORG_ID = '00000000-0000-0000-0000-000000000099'
const PLATFORM_ORG_NAME = 'Platform Administration'

interface CsvRow {
  email: string
  full_name: string
  role: string
  manager_email: string
  line: number
}

interface RowResult {
  email: string
  status: 'invited' | 'created' | 'skipped' | 'error'
  message?: string
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

function parseRows(csv: string): { rows: CsvRow[]; error?: string } {
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

  const rows: CsvRow[] = []
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

  return { rows }
}

function validateRows(rows: CsvRow[]): string | null {
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

    if (row.role === 'employee' && row.manager_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.manager_email)) {
      return `Line ${row.line}: invalid manager_email.`
    }
    if (row.role !== 'employee' && row.manager_email) {
      return `Line ${row.line}: manager_email should only be set for employees.`
    }
  }

  return null
}

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) return found.id
    if (data.users.length < 1000) break
    page++
  }
  return null
}

async function resolveManagerId(
  admin: SupabaseClient,
  orgId: string,
  managerEmail: string,
  emailToId: Map<string, string>
): Promise<string | null> {
  const fromBatch = emailToId.get(managerEmail)
  if (fromBatch) return fromBatch

  const authId = await findUserIdByEmail(admin, managerEmail)
  if (!authId) return null

  const { data } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', authId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (!data || data.role !== 'manager') return null
  return data.id
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function assertAdmin(adminClient: SupabaseClient, userId: string) {
  const { data: callerProfile, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !callerProfile) throw new Error('Caller profile not found.')
  if (callerProfile.role !== 'admin') throw new Error('Only admins can manage users.')
}

async function assertOrg(adminClient: SupabaseClient, orgId: string) {
  const { data, error } = await adminClient.from('organizations').select('id').eq('id', orgId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Organization not found.')
}

async function ensurePlatformOrg(adminClient: SupabaseClient) {
  const { error } = await adminClient.from('organizations').upsert({
    id: PLATFORM_ORG_ID,
    name: PLATFORM_ORG_NAME,
  })
  if (error) throw error
}

async function invitePlatformAdmin(
  adminClient: SupabaseClient,
  email: string,
  fullName: string,
  sendInvites: boolean,
  redirectTo: string | undefined
): Promise<RowResult> {
  const normalizedEmail = email.toLowerCase().trim()
  const name = fullName.trim() || deriveName(normalizedEmail)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { email: normalizedEmail, status: 'error', message: 'Invalid email.' }
  }

  await ensurePlatformOrg(adminClient)

  const existingId = await findUserIdByEmail(adminClient, normalizedEmail)
  if (existingId) {
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', existingId)
      .maybeSingle()

    if (existingProfile?.role === 'admin') {
      return { email: normalizedEmail, status: 'skipped', message: 'User is already a platform admin.' }
    }
    if (existingProfile) {
      return {
        email: normalizedEmail,
        status: 'error',
        message: 'User already exists as a hospital staff member. They cannot be promoted here.',
      }
    }
  }

  let userId = existingId

  if (!userId) {
    if (sendInvites) {
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo,
        data: { full_name: name },
      })
      if (error) throw error
      userId = data.user.id
    } else {
      const tempPassword = crypto.randomUUID().replace(/-/g, '') + 'Aa1!'
      const { data, error } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: name },
      })
      if (error) throw error
      userId = data.user.id
    }
  }

  const { error: insertError } = await adminClient.from('profiles').insert({
    id: userId,
    org_id: PLATFORM_ORG_ID,
    manager_id: null,
    full_name: name,
    email: normalizedEmail,
    role: 'admin',
    is_active: true,
  })

  if (insertError) {
    if (!existingId) await adminClient.auth.admin.deleteUser(userId)
    throw insertError
  }

  return {
    email: normalizedEmail,
    status: sendInvites && !existingId ? 'invited' : 'created',
    message: existingId
      ? 'Linked existing auth account as platform admin.'
      : sendInvites
        ? 'Invite email sent.'
        : 'Admin account created. User should use Forgot password to set a password.',
  }
}

interface InviteInput {
  email: string
  full_name: string
  role: string
  manager_email?: string
}

async function inviteOneUser(
  adminClient: SupabaseClient,
  orgId: string,
  input: InviteInput,
  sendInvites: boolean,
  redirectTo: string | undefined,
  emailToId: Map<string, string>
): Promise<RowResult> {
  const row: CsvRow = {
    email: input.email.toLowerCase().trim(),
    full_name: input.full_name.trim() || deriveName(input.email),
    role: (input.role || DEFAULT_ROLE).toLowerCase(),
    manager_email: (input.manager_email ?? '').toLowerCase().trim(),
    line: 0,
  }

  if (!VALID_ROLES.has(row.role)) {
    return { email: row.email, status: 'error', message: 'Invalid role.' }
  }
  if (row.role === 'admin') {
    return {
      email: row.email,
      status: 'error',
      message: 'Platform admins are not organization members. Create admins via Supabase bootstrap SQL.',
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    return { email: row.email, status: 'error', message: 'Invalid email.' }
  }

  const existingId = await findUserIdByEmail(adminClient, row.email)
  if (existingId) {
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, org_id')
      .eq('id', existingId)
      .maybeSingle()

    if (existingProfile) {
      if (existingProfile.org_id === orgId) {
        return { email: row.email, status: 'skipped', message: 'User already exists in this organization.' }
      }
      return { email: row.email, status: 'error', message: 'User already belongs to another organization.' }
    }
  }

  let managerId: string | null = null
  if (row.role === 'employee' && row.manager_email) {
    managerId = await resolveManagerId(adminClient, orgId, row.manager_email, emailToId)
    if (!managerId) {
      return {
        email: row.email,
        status: 'error',
        message: `Manager not found in this org: ${row.manager_email}`,
      }
    }
  }

  let userId = existingId

  if (!userId) {
    if (sendInvites) {
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(row.email, {
        redirectTo,
        data: { full_name: row.full_name },
      })
      if (error) throw error
      userId = data.user.id
    } else {
      const tempPassword = crypto.randomUUID().replace(/-/g, '') + 'Aa1!'
      const { data, error } = await adminClient.auth.admin.createUser({
        email: row.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: row.full_name },
      })
      if (error) throw error
      userId = data.user.id
    }
  }

  const { error: insertError } = await adminClient.from('profiles').insert({
    id: userId,
    org_id: orgId,
    manager_id: managerId,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    is_active: true,
  })

  if (insertError) {
    if (!existingId) await adminClient.auth.admin.deleteUser(userId)
    throw insertError
  }

  emailToId.set(row.email, userId)
  return {
    email: row.email,
    status: sendInvites && !existingId ? 'invited' : 'created',
    message: existingId
      ? 'Linked existing auth account to organization.'
      : sendInvites
        ? 'Invite email sent.'
        : 'Account created. User should use Forgot password to set a password.',
  }
}

async function handleImportCsv(
  adminClient: SupabaseClient,
  orgId: string,
  csv: string,
  sendInvites: boolean,
  redirectTo: string | undefined
) {
  const { rows, error: parseError } = parseRows(csv)
  if (parseError) return jsonResponse({ error: parseError }, 400)

  const validationError = validateRows(rows)
  if (validationError) return jsonResponse({ error: validationError }, 400)

  rows.sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99))

  const emailToId = new Map<string, string>()
  const results: RowResult[] = []

  for (const row of rows) {
    try {
      const result = await inviteOneUser(
        adminClient,
        orgId,
        row,
        sendInvites,
        redirectTo,
        emailToId
      )
      results.push(result)
      await sleep(75)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ email: row.email, status: 'error', message: msg })
    }
  }

  return jsonResponse({
    summary: {
      total: results.length,
      invited: results.filter((r) => r.status === 'invited').length,
      created: results.filter((r) => r.status === 'created').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed: results.filter((r) => r.status === 'error').length,
    },
    rows: results,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Server misconfigured.' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing authorization header.' }, 401)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) return jsonResponse({ error: 'Unauthorized.' }, 401)

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    await assertAdmin(adminClient, user.id)

    const body = await req.json()
    const action = typeof body.action === 'string' ? body.action : 'import_csv'
    const sendInvites = body.send_invites !== false
    // Prefer server secret so invite emails never use localhost from a dev session.
    const DEFAULT_INVITE_REDIRECT = 'https://patguettler.github.io/guardian-md/accept-invite'
    const redirectTo =
      Deno.env.get('INVITE_REDIRECT_URL') ??
      (typeof body.redirect_to === 'string' && body.redirect_to ? body.redirect_to : undefined) ??
      DEFAULT_INVITE_REDIRECT

    if (action === 'invite_platform_admin') {
      const email = typeof body.email === 'string' ? body.email : ''
      if (!email) return jsonResponse({ error: 'email is required.' }, 400)

      const result = await invitePlatformAdmin(
        adminClient,
        email,
        typeof body.full_name === 'string' ? body.full_name : '',
        sendInvites,
        redirectTo
      )
      return jsonResponse({ row: result })
    }

    const orgId = typeof body.org_id === 'string' ? body.org_id : ''
    if (!orgId) return jsonResponse({ error: 'org_id is required.' }, 400)
    await assertOrg(adminClient, orgId)

    if (action === 'invite_one') {
      const email = typeof body.email === 'string' ? body.email : ''
      if (!email) return jsonResponse({ error: 'email is required.' }, 400)

      const result = await inviteOneUser(
        adminClient,
        orgId,
        {
          email,
          full_name: typeof body.full_name === 'string' ? body.full_name : '',
          role: typeof body.role === 'string' ? body.role : DEFAULT_ROLE,
          manager_email: typeof body.manager_email === 'string' ? body.manager_email : undefined,
        },
        sendInvites,
        redirectTo,
        new Map()
      )

      return jsonResponse({ row: result })
    }

    if (action === 'delete_organization') {
      if (orgId === PLATFORM_ORG_ID) {
        return jsonResponse(
          { error: 'The platform administration organization cannot be deleted.' },
          400
        )
      }

      const { data: members, error: membersError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('org_id', orgId)
      if (membersError) throw membersError

      const { data: deleted, error: deleteError } = await adminClient
        .from('organizations')
        .delete()
        .eq('id', orgId)
        .select('id')
      if (deleteError) throw deleteError
      if (!deleted?.length) {
        return jsonResponse({ error: 'Organization not found or could not be deleted.' }, 404)
      }

      for (const member of members ?? []) {
        const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(member.id)
        if (authDeleteError) {
          console.error(`Failed to delete auth user ${member.id}:`, authDeleteError.message)
        }
      }

      return jsonResponse({ deleted_id: orgId })
    }

    if (action === 'delete_org_user') {
      const userId = typeof body.user_id === 'string' ? body.user_id : ''
      if (!userId) return jsonResponse({ error: 'user_id is required.' }, 400)

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('id, role, org_id')
        .eq('id', userId)
        .eq('org_id', orgId)
        .maybeSingle()

      if (profileError) throw profileError
      if (!profile) {
        return jsonResponse({ error: 'User not found in this organization.' }, 404)
      }
      if (profile.role === 'admin') {
        return jsonResponse({ error: 'Cannot delete platform admin accounts here.' }, 400)
      }

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)
      if (authDeleteError) throw authDeleteError

      return jsonResponse({ deleted_id: userId })
    }

    if (action === 'update_user') {
      const userId = typeof body.user_id === 'string' ? body.user_id : ''
      if (!userId) return jsonResponse({ error: 'user_id is required.' }, 400)

      if (body.role === 'admin') {
        return jsonResponse({ error: 'Cannot assign platform admin role from an organization.' }, 400)
      }

      const patch: Record<string, unknown> = {}
      if (typeof body.role === 'string' && VALID_ROLES.has(body.role)) patch.role = body.role
      if (typeof body.full_name === 'string') patch.full_name = body.full_name.trim()
      if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
      if (body.manager_id === null) patch.manager_id = null
      if (typeof body.manager_id === 'string') patch.manager_id = body.manager_id

      if (Object.keys(patch).length === 0) {
        return jsonResponse({ error: 'No valid fields to update.' }, 400)
      }

      const { data, error } = await adminClient
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return jsonResponse({ profile: data })
    }

    if (action === 'import_csv') {
      const csv = typeof body.csv === 'string' ? body.csv : ''
      if (!csv) return jsonResponse({ error: 'csv is required.' }, 400)
      return await handleImportCsv(adminClient, orgId, csv, sendInvites, redirectTo)
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed'
    return jsonResponse({ error: message }, 500)
  }
})
