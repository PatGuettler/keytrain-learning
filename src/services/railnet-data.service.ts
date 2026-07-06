import { getEdgeFunctionAccessToken } from '@/lib/edge-function-auth'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/services/supabase'
import type { RailNetDataResponse } from '@/types/railnet.types'

export async function fetchRailNetData(railnetOrgIds?: string[]): Promise<RailNetDataResponse> {
  const baseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!baseUrl || !anonKey) {
    throw new Error('Backend is not configured.')
  }

  const accessToken = await getEdgeFunctionAccessToken()

  const response = await fetch(`${baseUrl}/functions/v1/aws-railnet-bridge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      railnet_org_ids: railnetOrgIds?.length ? railnetOrgIds : undefined,
    }),
  })

  const data = (await response.json().catch(() => null)) as RailNetDataResponse | null
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not load RailNet data from AWS.')
  }
  if (!data) {
    throw new Error('Empty response from RailNet bridge.')
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
        'RailNet signature updates are not deployed. Run npm run deploy:railnet-signatures (or deploy:railnet-bridge) on the server.'
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
