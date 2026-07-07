import { getSupabaseAnonKey, getSupabaseUrl } from '@/services/supabase'

type JoinOrgResponse = {
  message?: string
  organization_name?: string
  error?: string
}

export async function joinOrganizationWithCode(payload: {
  join_code: string
  email: string
  full_name: string
  password: string
}): Promise<{ message: string; organizationName: string }> {
  const baseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!baseUrl || !anonKey) {
    throw new Error('Backend is not configured.')
  }

  const response = await fetch(`${baseUrl}/functions/v1/join-organization`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => null)) as JoinOrgResponse | null
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not join organization.')
  }

  return {
    message: data?.message ?? 'Account created. Sign in to continue.',
    organizationName: data?.organization_name ?? 'your organization',
  }
}

/** Display format for join codes (XXXX-XXXX-XXXX). */
export function formatJoinCodeDisplay(raw: string): string {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (compact.length !== 12) return raw.toUpperCase()
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`
}
