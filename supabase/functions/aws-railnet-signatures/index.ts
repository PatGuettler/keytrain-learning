import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, corsHeadersForRequest } from '../_shared/cors.ts'
import {
  createHiveDynamoClient,
  formatAwsError,
  HIVE_TABLES,
  updateSignatureApproval,
} from '../_shared/hive-aws.ts'

let requestCors: Record<string, string> = corsHeaders

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...requestCors, 'Content-Type': 'application/json' },
  })
}

async function assertAdmin(
  adminClient: ReturnType<typeof createClient>,
  userId: string
): Promise<{ email: string }> {
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .single()

  if (error || profile?.role !== 'admin') {
    throw new Error('Only admins can update RailNet signatures.')
  }

  const email = String(profile.email ?? '').trim()
  return { email: email || userId }
}

function parseBody(body: Record<string, unknown>) {
  const pk = typeof body.signature_pk === 'string' ? body.signature_pk.trim() : ''
  const sk = typeof body.signature_sk === 'string' ? body.signature_sk.trim() : ''
  const action = body.action === 'approve' || body.action === 'reject' ? body.action : null

  if (!pk || !sk || !action) {
    throw new Error('signature_pk, signature_sk, and action (approve|reject) are required.')
  }
  if (!sk.startsWith('SIG#')) {
    throw new Error('signature_sk must be a SIG# sort key.')
  }

  return { pk, sk, action }
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
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header.' }, 401)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized.' }, 401)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { email } = await assertAdmin(adminClient, user.id)
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const input = parseBody(body)
    const dynamo = createHiveDynamoClient()

    const updated = await updateSignatureApproval(dynamo, {
      pk: input.pk,
      sk: input.sk,
      action: input.action,
      approvedBy: email,
    })

    return jsonResponse({
      ok: true,
      table: HIVE_TABLES.signatures,
      signature: updated,
    })
  } catch (error) {
    const message = formatAwsError(error)
    console.error('aws-railnet-signatures error:', message)
    const status = message.includes('Only admins') ? 403 : message.includes('required') ? 400 : 500
    return jsonResponse({ error: message }, status)
  }
})
