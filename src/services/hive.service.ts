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

type SignatureAction = 'approve' | 'reject'

async function updateSignatureApproval(
  signaturePk: string,
  signatureSk: string,
  action: SignatureAction
): Promise<void> {
  const baseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!baseUrl || !anonKey) {
    throw new Error('Backend is not configured.')
  }

  const accessToken = await getEdgeFunctionAccessToken()

  const response = await fetch(`${baseUrl}/functions/v1/aws-railnet-signatures`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      signature_pk: signaturePk,
      signature_sk: signatureSk,
      action,
    }),
  })

  const data = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        'RailNet signature updates are not deployed. Run npm run deploy:railnet-signatures (or deploy:hive-bridge) on the server.'
      )
    }
    throw new Error(data?.error ?? 'Could not update signature in AWS.')
  }
}

export function approveSignature(signaturePk: string, signatureSk: string): Promise<void> {
  return updateSignatureApproval(signaturePk, signatureSk, 'approve')
}

export function rejectSignature(signaturePk: string, signatureSk: string): Promise<void> {
  return updateSignatureApproval(signaturePk, signatureSk, 'reject')
}
