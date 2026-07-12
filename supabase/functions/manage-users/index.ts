import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, corsHeadersForRequest } from '../_shared/cors.ts'
import { getEmailValidationError, isValidEmail } from '../_shared/email-validation.ts'
import { generateJoinCode } from '../_shared/join-code.ts'

const MAX_ROWS = 500
const ROLE_ORDER: Record<string, number> = { admin: 0, manager: 1, employee: 2 }
const VALID_ROLES = new Set(['admin', 'org_admin', 'manager', 'employee'])
const ORG_ASSIGNABLE_ROLES = new Set(['org_admin', 'manager', 'employee'])
const ORG_ADMIN_ASSIGNABLE_ROLES = new Set(['manager', 'employee'])
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

let requestCors: Record<string, string> = corsHeaders

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...requestCors, 'Content-Type': 'application/json' },
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
    if (!ORG_ASSIGNABLE_ROLES.has(row.role) && row.role !== 'admin') {
      return `Line ${row.line}: role must be org_admin, manager, or employee (defaults to employee if omitted).`
    }
    if (row.role === 'admin') {
      return `Line ${row.line}: platform admins cannot be added to an organization via CSV.`
    }
    const emailError = getEmailValidationError(row.email)
    if (emailError) {
      return `Line ${row.line}: ${emailError}`
    }
    if (emails.has(row.email)) return `Duplicate email in CSV: ${row.email}`
    emails.add(row.email)

    if (row.role === 'employee' && row.manager_email) {
      const managerError = getEmailValidationError(row.manager_email)
      if (managerError) return `Line ${row.line}: ${managerError}`
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

type CallerContext = {
  role: string
  org_id: string
}

async function getCaller(adminClient: SupabaseClient, userId: string): Promise<CallerContext> {
  const { data: callerProfile, error } = await adminClient
    .from('profiles')
    .select('role, org_id')
    .eq('id', userId)
    .single()

  if (error || !callerProfile) throw new Error('Caller profile not found.')
  return { role: callerProfile.role, org_id: callerProfile.org_id }
}

/** Platform admin: any org. Org admin: own org only; cannot assign org_admin. */
function assertCanManageOrgUsers(caller: CallerContext, orgId: string, roleBeingAssigned?: string) {
  if (caller.role === 'admin') {
    if (roleBeingAssigned && roleBeingAssigned !== 'admin' && !ORG_ASSIGNABLE_ROLES.has(roleBeingAssigned)) {
      throw new Error('Invalid role.')
    }
    return
  }
  if (caller.role === 'org_admin') {
    if (caller.org_id !== orgId) throw new Error('You can only manage users in your organization.')
    if (roleBeingAssigned === 'org_admin' || roleBeingAssigned === 'admin') {
      throw new Error('Only KeyTrain Learning admins can assign org admin.')
    }
    if (roleBeingAssigned && !ORG_ADMIN_ASSIGNABLE_ROLES.has(roleBeingAssigned)) {
      throw new Error('Invalid role.')
    }
    return
  }
  throw new Error('Only admins can manage users.')
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

  const emailError = getEmailValidationError(normalizedEmail)
  if (emailError) {
    return { email: normalizedEmail, status: 'error', message: emailError }
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
    invitation_pending: sendInvites && !existingId,
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

  if (!ORG_ASSIGNABLE_ROLES.has(row.role)) {
    return { email: row.email, status: 'error', message: 'Invalid role.' }
  }
  if (row.role === 'admin') {
    return {
      email: row.email,
      status: 'error',
      message: 'Platform admins are not organization members. Create admins via Supabase bootstrap SQL.',
    }
  }
  const rowEmailError = getEmailValidationError(row.email)
  if (rowEmailError) {
    return { email: row.email, status: 'error', message: rowEmailError }
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

  const invitedNewUser = sendInvites && !existingId

  const { error: insertError } = await adminClient.from('profiles').insert({
    id: userId,
    org_id: orgId,
    manager_id: managerId,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    is_active: true,
    invitation_pending: invitedNewUser,
  })

  if (insertError) {
    if (!existingId) await adminClient.auth.admin.deleteUser(userId)
    throw insertError
  }

  emailToId.set(row.email, userId)
  return {
    email: row.email,
    status: invitedNewUser ? 'invited' : 'created',
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
  requestCors = corsHeadersForRequest(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: requestCors })
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

    const caller = await getCaller(adminClient, user.id)

    const body = await req.json()
    const action = typeof body.action === 'string' ? body.action : 'import_csv'
    const sendInvites = body.send_invites !== false
    // Always use production invite URL — never trust the browser (localhost breaks invite emails).
    const PRODUCTION_INVITE_REDIRECT = 'https://keytrainlearning.com/accept-invite'
    const redirectTo = Deno.env.get('INVITE_REDIRECT_URL') ?? PRODUCTION_INVITE_REDIRECT

    if (action === 'invite_platform_admin') {
      if (caller.role !== 'admin') throw new Error('Only admins can manage users.')
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

    if (action === 'delete_platform_admin') {
      if (caller.role !== 'admin') throw new Error('Only admins can manage users.')
      const userId = typeof body.user_id === 'string' ? body.user_id : ''
      if (!userId) return jsonResponse({ error: 'user_id is required.' }, 400)
      if (userId === user.id) {
        return jsonResponse({ error: 'You cannot delete your own admin account.' }, 400)
      }

      const { count, error: countError } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
      if (countError) throw countError
      if ((count ?? 0) <= 1) {
        return jsonResponse({ error: 'Cannot delete the last platform admin.' }, 400)
      }

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .eq('role', 'admin')
        .maybeSingle()
      if (profileError) throw profileError
      if (!profile) return jsonResponse({ error: 'Platform admin not found.' }, 404)

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)
      if (authDeleteError) throw authDeleteError

      return jsonResponse({ deleted_id: userId })
    }

    const orgId = typeof body.org_id === 'string' ? body.org_id : ''
    if (!orgId) return jsonResponse({ error: 'org_id is required.' }, 400)
    await assertOrg(adminClient, orgId)

    if (action === 'delete_organization') {
      if (caller.role !== 'admin') throw new Error('Only admins can manage users.')
    } else if (action === 'regenerate_org_join_code') {
      assertCanManageOrgUsers(caller, orgId)
    } else {
      const roleHint =
        typeof body.role === 'string'
          ? body.role
          : action === 'import_csv'
            ? undefined
            : undefined
      assertCanManageOrgUsers(caller, orgId, roleHint)
    }

    if (action === 'regenerate_org_join_code') {
      const code = generateJoinCode()
      const { data, error } = await adminClient
        .from('organizations')
        .update({ join_code: code })
        .eq('id', orgId)
        .select('id, name, join_code')
        .single()
      if (error) throw error
      return jsonResponse({ join_code: data.join_code, organization_name: data.name })
    }

    if (action === 'invite_one') {
      const email = typeof body.email === 'string' ? body.email : ''
      if (!email) return jsonResponse({ error: 'email is required.' }, 400)
      const inviteRole = typeof body.role === 'string' ? body.role : DEFAULT_ROLE
      assertCanManageOrgUsers(caller, orgId, inviteRole)

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

    if (action === 'send_password_reset') {
      const userId = typeof body.user_id === 'string' ? body.user_id : ''
      if (!userId) return jsonResponse({ error: 'user_id is required.' }, 400)

      const profileQuery = adminClient.from('profiles').select('id, email, org_id, role').eq('id', userId)
      // Platform path resets any admin (their org_id may not be the platform org,
      // e.g. the original bootstrap admin); org path stays scoped to that org.
      const { data: profile, error: profileError } =
        orgId === PLATFORM_ORG_ID
          ? await profileQuery.eq('role', 'admin').maybeSingle()
          : await profileQuery.eq('org_id', orgId).maybeSingle()

      if (profileError) throw profileError
      if (!profile) {
        return jsonResponse({ error: 'User not found in this scope.' }, 404)
      }

      // profiles.email can be stale/null; auth.users is the source of truth.
      let targetEmail = profile.email ?? null
      if (!targetEmail) {
        const { data: authUser, error: authUserError } =
          await adminClient.auth.admin.getUserById(userId)
        if (authUserError) throw authUserError
        targetEmail = authUser.user?.email ?? null
      }
      if (!targetEmail) {
        return jsonResponse({ error: 'User has no email address on file.' }, 422)
      }

      const resetRedirect =
        typeof body.redirect_to === 'string' && body.redirect_to.length > 0
          ? body.redirect_to
          : (redirectTo?.replace('/accept-invite', '/reset-password') ??
            'https://keytrainlearning.com/reset-password')

      const { error: resetError } = await adminClient.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: resetRedirect,
      })
      if (resetError) {
        console.error('resetPasswordForEmail failed', {
          status: resetError.status,
          message: resetError.message,
          redirectTo: resetRedirect,
        })
        const status = resetError.status === 429 ? 429 : 400
        const hint =
          resetError.status === 429
            ? 'Too many reset requests for this account. Wait a minute and try again.'
            : `Could not send the reset email. Confirm custom SMTP is set in Supabase → Auth, and that "${resetRedirect}" is listed under Auth → URL Configuration → Redirect URLs.`
        return jsonResponse({ error: `${hint} (${resetError.message})` }, status)
      }

      await adminClient
        .from('profiles')
        .update({ failed_login_attempts: 0, login_locked_at: null })
        .eq('id', userId)

      return jsonResponse({ message: 'Password reset email sent.' })
    }

    if (action === 'unlock_user_login') {
      const userId = typeof body.user_id === 'string' ? body.user_id : ''
      if (!userId) return jsonResponse({ error: 'user_id is required.' }, 400)

      const profileQuery = adminClient.from('profiles').select('id, org_id').eq('id', userId)
      const { data: profile, error: profileError } =
        orgId === PLATFORM_ORG_ID
          ? await profileQuery.maybeSingle()
          : await profileQuery.eq('org_id', orgId).maybeSingle()

      if (profileError) throw profileError
      if (!profile) return jsonResponse({ error: 'User not found.' }, 404)

      const { error: unlockError } = await adminClient
        .from('profiles')
        .update({ failed_login_attempts: 0, login_locked_at: null })
        .eq('id', userId)
      if (unlockError) throw unlockError

      return jsonResponse({ message: 'Account login unlocked.' })
    }

    if (action === 'update_user') {
      const userId = typeof body.user_id === 'string' ? body.user_id : ''
      if (!userId) return jsonResponse({ error: 'user_id is required.' }, 400)

      if (body.role === 'admin') {
        return jsonResponse({ error: 'Cannot assign platform admin role from an organization.' }, 400)
      }

      if (typeof body.role === 'string') {
        assertCanManageOrgUsers(caller, orgId, body.role)
      }

      const patch: Record<string, unknown> = {}
      if (typeof body.role === 'string' && ORG_ASSIGNABLE_ROLES.has(body.role)) patch.role = body.role
      if (typeof body.full_name === 'string') patch.full_name = body.full_name.trim()
      if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
      if (typeof body.railnet_enabled === 'boolean') patch.railnet_enabled = body.railnet_enabled
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
      if (caller.role === 'org_admin') {
        const parsed = parseCsv(csv)
        for (const row of parsed.rows) {
          if (row.role === 'org_admin') {
            return jsonResponse(
              { error: 'Only KeyTrain Learning admins can assign org admin via CSV.' },
              400
            )
          }
        }
      }
      return await handleImportCsv(adminClient, orgId, csv, sendInvites, redirectTo)
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    console.error('manage-users error', err)
    const message = err instanceof Error ? err.message : 'Request failed'
    return jsonResponse({ error: message }, 500)
  }
})
