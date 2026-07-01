import { DynamoDBClient } from 'npm:@aws-sdk/client-dynamodb@3'
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from 'npm:@aws-sdk/lib-dynamodb@3'

export const HIVE_TABLES = {
  indicators: 'KeyTrainHiveIndicators',
  trendReports: 'KeyTrainHiveTrendReports',
  trainingAssignments: 'KeyTrainTrainingAssignments',
  signatures: 'KeyTrainHiveSignatures',
} as const

export type HiveTableKey = keyof typeof HIVE_TABLES

export function hiveOrgPk(orgId: string): string {
  return orgId.startsWith('ORG#') ? orgId : `ORG#${orgId}`
}

export function parseHiveOrgId(pk: unknown): string {
  const value = String(pk ?? '')
  return value.startsWith('ORG#') ? value.slice(4) : value
}

export function createHiveDynamoClient(): DynamoDBDocumentClient {
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

export function configuredHiveOrgIds(): string[] {
  const raw = Deno.env.get('HIVE_ORG_IDS')?.trim()
  if (!raw) return []
  return [...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))]
}

function normalizeItem(item: Record<string, unknown>): Record<string, unknown> {
  const sk = String(item.sk ?? '')
  const record: Record<string, unknown> = {
    ...item,
    hive_org_id: parseHiveOrgId(item.pk),
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
        ExpressionAttributeValues: { ':pk': hiveOrgPk(orgId) },
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

export async function fetchHiveTable(
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
  return items.filter((item) => allowed.has(String(item.hive_org_id ?? '')))
}

export function collectOrgIds(...itemGroups: Record<string, unknown>[][]): string[] {
  const ids = new Set<string>()
  for (const group of itemGroups) {
    for (const item of group) {
      const orgId = String(item.hive_org_id ?? '').trim()
      if (orgId) ids.add(orgId)
    }
  }
  return [...ids].sort((a, b) => a.localeCompare(b))
}
