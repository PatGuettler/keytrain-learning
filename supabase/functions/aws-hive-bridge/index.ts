import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, corsHeadersForRequest } from '../_shared/cors.ts'
import {
  collectOrgIds,
  configuredHiveOrgIds,
  createHiveDynamoClient,
  fetchHiveTable,
  filterByOrgIds,
  HIVE_TABLES,
  resolveRailnetBridgeAccess,
} from '../_shared/hive-aws.ts'

let requestCors: Record<string, string> = corsHeaders

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...requestCors, 'Content-Type': 'application/json' },
  })
}

function parseOrgFilter(body: Record<string, unknown>): string[] | undefined {
  if (!Array.isArray(body.hive_org_ids)) return undefined
  const ids = body.hive_org_ids
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
  return ids.length > 0 ? [...new Set(ids)] : undefined
}

function errorStatus(message: string): number {
  if (
    message.includes('RailNet access') ||
    message.includes('Only admins') ||
    message.includes('not configured')
  ) {
    return 403
  }
  if (message.includes('Unauthorized') || message.includes('authorization')) {
    return 401
  }
  return 500
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

    const access = await resolveRailnetBridgeAccess(adminClient, user.id)

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const requestedFilter = parseOrgFilter(body)
    const orgFilter = access.isPlatformAdmin
      ? requestedFilter
      : access.hiveOrgId
        ? [access.hiveOrgId]
        : undefined

    const queryOrgIds = configuredHiveOrgIds()
    const dynamo = createHiveDynamoClient()

    const [indicators, trendReports, trainingAssignments, signatures] = await Promise.all([
      fetchHiveTable(dynamo, HIVE_TABLES.indicators, queryOrgIds),
      fetchHiveTable(dynamo, HIVE_TABLES.trendReports, queryOrgIds),
      fetchHiveTable(dynamo, HIVE_TABLES.trainingAssignments, queryOrgIds),
      fetchHiveTable(dynamo, HIVE_TABLES.signatures, queryOrgIds),
    ])

    const filteredIndicators = filterByOrgIds(indicators, orgFilter)
    const filteredTrendReports = filterByOrgIds(trendReports, orgFilter)
    const filteredTrainingAssignments = filterByOrgIds(trainingAssignments, orgFilter)
    const filteredSignatures = filterByOrgIds(signatures, orgFilter)

    const hostBatchCount = filteredIndicators.filter((item) =>
      String(item.sk ?? '').startsWith('BATCH#')
    ).length
    const legacyIocCount = filteredIndicators.filter((item) =>
      String(item.sk ?? '').startsWith('TS#')
    ).length

    const orgIds = collectOrgIds(
      filteredIndicators,
      filteredTrendReports,
      filteredTrainingAssignments,
      filteredSignatures
    )

    return jsonResponse({
      fetched_at: new Date().toISOString(),
      region: Deno.env.get('AWS_REGION')?.trim() ?? 'us-east-2',
      org_ids: orgIds,
      counts: {
        indicators: filteredIndicators.length,
        host_batches: hostBatchCount,
        legacy_iocs: legacyIocCount,
        trend_reports: filteredTrendReports.length,
        training_assignments: filteredTrainingAssignments.length,
        signatures: filteredSignatures.length,
      },
      indicators: filteredIndicators,
      trend_reports: filteredTrendReports,
      training_assignments: filteredTrainingAssignments,
      signatures: filteredSignatures,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Hive data.'
    console.error('aws-hive-bridge error:', message)
    return jsonResponse({ error: message }, errorStatus(message))
  }
})
