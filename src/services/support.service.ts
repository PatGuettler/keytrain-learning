import type { SupportCategory } from '@/lib/support-categories'
import { getEdgeFunctionAccessToken } from '@/lib/edge-function-auth'
import { getSupabase, getSupabaseAnonKey, getSupabaseUrl } from '@/services/supabase'
import { useAuthStore } from '@/store/authStore'

type SupportResponse = {
  error?: string
  message?: string
  saved?: boolean
  email_sent?: boolean
  resend_status?: number
}

export async function submitSupportRequest(payload: {
  category: SupportCategory
  subject: string
  message: string
}) {
  const supabase = getSupabase()
  const baseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!supabase || !baseUrl || !anonKey) throw new Error('Backend is not configured.')

  const profile = useAuthStore.getState().profile
  const userId = useAuthStore.getState().userId
  if (!profile || !userId) throw new Error('You must be signed in.')

  const user_snapshot = {
    user_id: userId,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    org_id: profile.org_id,
    manager_id: profile.manager_id,
  }

  const accessToken = await getEdgeFunctionAccessToken()

  const response = await fetch(`${baseUrl}/functions/v1/send-support-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      category: payload.category,
      subject: payload.subject.trim(),
      message: payload.message.trim(),
      user_snapshot,
    }),
  })

  const data = (await response.json().catch(() => null)) as SupportResponse | null
  if (!response.ok) {
    throw new Error(data?.error ?? data?.message ?? 'Could not send support request.')
  }

  return {
    message: data?.message ?? 'Your message was sent. Thank you!',
    emailSent: data?.email_sent ?? false,
    saved: data?.saved ?? true,
  }
}
