import { DynamoDBClient } from 'npm:@aws-sdk/client-dynamodb@3'
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from 'npm:@aws-sdk/lib-dynamodb@3'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const RAILNET_AWS_TABLES = {
  /** Legacy AWS DynamoDB table names (infrastructure not yet renamed in AWS). */
  indicators: 'KeyTrainHiveIndicators',
  trendReports: 'KeyTrainHiveTrendReports',
  trainingAssignments: 'KeyTrainTrainingAssignments',
  signatures: 'KeyTrainHiveSignatures',
} as const

/** Internal platform org — platform admins live here. */
export const PLATFORM_ORG_ID = '00000000-0000-0000-0000-000000000099'

export type RailnetBridgeAccess = {
  isKtlAdmin: boolean
  /** When set, responses are limited to this AWS org id. */
  railnetOrgId: string | null
}

export async function resolveRailnetBridgeAccess(
  adminClient: SupabaseClient,
  userId: string
): Promise<RailnetBridgeAccess> {
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role, org_id, railnet_enabled')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw new Error('Profile not found.')
  }

  const isKtlAdmin = profile.role === 'admin'

  if (isKtlAdmin) {
    return { isKtlAdmin: true, railnetOrgId: null }
  }

  if (profile.railnet_enabled !== true) {
    throw new Error('You do not have RailNet access.')
  }

  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .select('railnet_org_id')
    .eq('id', profile.org_id)
    .single()

  if (orgError || !org) {
    throw new Error('Organization not found.')
  }

  const railnetOrgId = String(org.railnet_org_id ?? '').trim()
  if (!railnetOrgId) {
    throw new Error('RailNet is not configured for your organization.')
  }

  return { isKtlAdmin: false, railnetOrgId }
}

export type RailNetTableKey = keyof typeof RAILNET_AWS_TABLES

export function railnetOrgPk(orgId: string): string {
  return orgId.startsWith('ORG#') ? orgId : `ORG#${orgId}`
}

export function parseRailnetOrgId(pk: unknown): string {
  const value = String(pk ?? '')
  return value.startsWith('ORG#') ? value.slice(4) : value
}

export function createRailNetDynamoClient(): DynamoDBDocumentClient {
  const region = Deno.env.get('AWS_REGION')?.trim() ?? 'us-east-2'
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')?.trim()
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')?.trim()

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are not configured on the server.')
  }

  const client = new DynamoDBClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  })
}

/** Map AWS SDK errors to actionable messages for Supabase edge function responses. */
export function formatAwsError(error: unknown): string {
  const name =
    error && typeof error === 'object' && 'name' in error
      ? String((error as { name?: string }).name)
      : ''
  const message = error instanceof Error ? error.message : String(error)

  if (
    name === 'UnrecognizedClientException' ||
    name === 'InvalidClientTokenId' ||
    message.includes('security token included in the request is invalid')
  ) {
    return (
      'AWS credentials rejected (invalid access key or secret). ' +
      'In Supabase → Edge Functions → Secrets, verify AWS_ACCESS_KEY_ID and ' +
      'AWS_SECRET_ACCESS_KEY are a matching pair with no extra spaces, and AWS_REGION=us-east-2.'
    )
  }

  if (name === 'AccessDeniedException' || message.includes('not authorized')) {
    return (
      `AWS denied DynamoDB access: ${message} ` +
      'The IAM user needs dynamodb:Query and dynamodb:Scan on RailNet tables for reads, ' +
      'and dynamodb:UpdateItem on KeyTrainHiveSignatures for signature approve.'
    )
  }

  return message || 'AWS request failed.'
}

export function configuredRailNetOrgIds(): string[] {
  const raw = Deno.env.get('RAILNET_ORG_IDS')?.trim()
  if (!raw) return []
  return [...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))]
}

function normalizeItem(item: Record<string, unknown>): Record<string, unknown> {
  const sk = String(item.sk ?? '')
  const record: Record<string, unknown> = {
    ...item,
    railnet_org_id: parseRailnetOrgId(item.pk),
  }

  if (sk.startsWith('BATCH#')) record.record_kind = 'batch'
  else if (sk.startsWith('TS#')) record.record_kind = 'legacy_ioc'
  else if (sk.startsWith('SIG#')) record.record_kind = 'signature'
  else if (sk.startsWith('TREND#')) record.record_kind = 'trend_report'
  else if (sk.startsWith('TRAINING#')) record.record_kind = 'training_assignment'

  return record
}

async function queryOrgItems(
  client: DynamoDBDocumentClient,
  tableName: string,
  orgId: string
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const result = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeNames: { '#pk': 'pk' },
        ExpressionAttributeValues: { ':pk': railnetOrgPk(orgId) },
        ExclusiveStartKey: lastKey,
      })
    )

    for (const item of result.Items ?? []) {
      items.push(normalizeItem(item as Record<string, unknown>))
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return items
}

async function scanOrgItems(
  client: DynamoDBDocumentClient,
  tableName: string
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: 'begins_with(#pk, :prefix)',
        ExpressionAttributeNames: { '#pk': 'pk' },
        ExpressionAttributeValues: { ':prefix': 'ORG#' },
        ExclusiveStartKey: lastKey,
      })
    )

    for (const item of result.Items ?? []) {
      items.push(normalizeItem(item as Record<string, unknown>))
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined
  } while (lastKey)

  return items
}

export async function fetchRailNetTable(
  client: DynamoDBDocumentClient,
  tableName: string,
  orgIds: string[]
): Promise<Record<string, unknown>[]> {
  if (orgIds.length > 0) {
    const batches = await Promise.all(
      orgIds.map((orgId) => queryOrgItems(client, tableName, orgId))
    )
    return batches.flat()
  }
  return scanOrgItems(client, tableName)
}

export function filterByOrgIds(
  items: Record<string, unknown>[],
  orgIds: string[] | undefined
): Record<string, unknown>[] {
  if (!orgIds || orgIds.length === 0) return items
  const allowed = new Set(orgIds)
  return items.filter((item) => allowed.has(String(item.railnet_org_id ?? '')))
}

export function collectOrgIds(...itemGroups: Record<string, unknown>[][]): string[] {
  const ids = new Set<string>()
  for (const group of itemGroups) {
    for (const item of group) {
      const orgId = String(item.railnet_org_id ?? '').trim()
      if (orgId) ids.add(orgId)
    }
  }
  return [...ids].sort((a, b) => a.localeCompare(b))
}

export async function updateSignatureApproval(
  client: DynamoDBDocumentClient,
  input: {
    pk: string
    sk: string
    action: 'approve' | 'reject'
    approvedBy: string
  }
): Promise<Record<string, unknown>> {
  const now = new Date().toISOString()

  if (input.action === 'approve') {
    const result = await client.send(
      new UpdateCommand({
        TableName: RAILNET_AWS_TABLES.signatures,
        Key: { pk: input.pk, sk: input.sk },
        UpdateExpression:
          'SET approval_status = :status, approved_by = :by, approved_utc = :utc',
        ExpressionAttributeValues: {
          ':status': 'approved',
          ':by': input.approvedBy,
          ':utc': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    )
    return (result.Attributes ?? {}) as Record<string, unknown>
  }

  const result = await client.send(
    new UpdateCommand({
      TableName: RAILNET_AWS_TABLES.signatures,
      Key: { pk: input.pk, sk: input.sk },
      UpdateExpression: 'SET approval_status = :status, rejected_utc = :utc',
      ExpressionAttributeValues: {
        ':status': 'rejected',
        ':utc': now,
      },
      ReturnValues: 'ALL_NEW',
    })
  )
  return (result.Attributes ?? {}) as Record<string, unknown>
}
