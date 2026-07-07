import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, corsHeadersForRequest } from '../_shared/cors.ts'
import { getEmailValidationError } from '../_shared/email-validation.ts'
import { joinCodeMatches } from '../_shared/join-code.ts'

const MIN_PASSWORD_LENGTH = 10
const PLATFORM_ORG_ID = '00000000-0000-0000-0000-000000000099'

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

async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      return jsonResponse({ error: 'Server is not configured.' }, 500)
    }

    const body = await req.json()
    const joinCodeRaw = typeof body.join_code === 'string' ? body.join_code : ''
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    const fullName =
      typeof body.full_name === 'string' && body.full_name.trim()
        ? body.full_name.trim()
        : deriveName(email)
    const password = typeof body.password === 'string' ? body.password : ''

    if (!joinCodeRaw.trim()) {
      return jsonResponse({ error: 'Organization join code is required.' }, 400)
    }
    const emailError = getEmailValidationError(email)
    if (emailError) return jsonResponse({ error: emailError }, 400)
    if (password.length < MIN_PASSWORD_LENGTH) {
      return jsonResponse(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        400
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: orgs, error: orgError } = await adminClient
      .from('organizations')
      .select('id, name, join_code')
      .not('join_code', 'is', null)
      .neq('id', PLATFORM_ORG_ID)

    if (orgError) throw orgError

    const matched = (orgs ?? []).find(
      (row) => row.join_code && joinCodeMatches(String(row.join_code), joinCodeRaw)
    )
    if (!matched) {
      return jsonResponse(
        { error: 'Invalid join code. Check the code from your administrator and try again.' },
        400
      )
    }

    const { data: license } = await adminClient
      .from('org_license')
      .select('max_seats')
      .eq('org_id', matched.id)
      .maybeSingle()

    if (license?.max_seats != null && license.max_seats > 0) {
      const { count, error: countError } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', matched.id)
        .eq('is_active', true)
      if (countError) throw countError
      if ((count ?? 0) >= license.max_seats) {
        return jsonResponse(
          {
            error:
              'This organization has reached its seat limit. Ask your administrator to add more seats or send you an invite.',
          },
          400
        )
      }
    }

    const existingId = await findUserIdByEmail(adminClient, email)
    if (existingId) {
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('org_id')
        .eq('id', existingId)
        .maybeSingle()

      if (existingProfile?.org_id === matched.id) {
        return jsonResponse(
          { error: 'An account with this email already exists in this organization. Sign in instead.' },
          400
        )
      }
      if (existingProfile) {
        return jsonResponse(
          { error: 'This email is already registered with another organization.' },
          400
        )
      }
    }

    let userId = existingId
    if (!userId) {
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })
      if (createError) throw createError
      userId = created.user.id
    }

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: userId,
      org_id: matched.id,
      manager_id: null,
      full_name: fullName,
      email,
      role: 'employee',
      is_active: true,
      invitation_pending: false,
    })

    if (profileError) {
      if (!existingId) await adminClient.auth.admin.deleteUser(userId)
      throw profileError
    }

    return jsonResponse({
      message: `Welcome to ${matched.name}. You can sign in now.`,
      organization_name: matched.name,
    })
  } catch (error) {
    console.error('join-organization error:', error)
    const message = error instanceof Error ? error.message : 'Could not complete registration.'
    return jsonResponse({ error: message }, 500)
  }
})
