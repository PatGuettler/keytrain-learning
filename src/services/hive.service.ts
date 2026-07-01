import { getEdgeFunctionAccessToken } from '@/lib/edge-function-auth'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/services/supabase'
import type { HiveDataResponse } from '@/types/hive.types'

export async function fetchHiveData(hiveOrgIds?: string[]): Promise<HiveDataResponse> {
  const baseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!baseUrl || !anonKey) {
    throw new Error('Backend is not configured.')
  }

  const accessToken = await getEdgeFunctionAccessToken()

  const response = await fetch(`${baseUrl}/functions/v1/aws-hive-bridge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      hive_org_ids: hiveOrgIds?.length ? hiveOrgIds : undefined,
    }),
  })

  const data = (await response.json().catch(() => null)) as HiveDataResponse | null
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not load Hive data from AWS.')
  }
  if (!data) {
    throw new Error('Empty response from Hive bridge.')
  }

  return data
}
