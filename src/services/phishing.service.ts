import { getPublicAppUrl } from '@/lib/backend-config'
import { EDGE_FUNCTION_DEPLOY_HINT } from '@/lib/edge-functions'
import { fetchProfiles } from '@/services/users.service'
import { getSupabase, getSupabaseAnonKey, getSupabaseUrl } from '@/services/supabase'
import type {
  PhishingCampaign,
  PhishingCampaignInput,
  PhishingEvent,
  PhishingRecipient,
  PhishingRecipientRow,
  PhishingTemplate,
  SendPhishingCampaignOptions,
  SendPhishingCampaignResult,
} from '@/types/phishing.types'

function requireSupabase() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchPhishingTemplates(): Promise<PhishingTemplate[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('phishing_templates')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    red_flags: Array.isArray(row.red_flags) ? (row.red_flags as string[]) : [],
  })) as PhishingTemplate[]
}

export async function fetchPhishingCampaigns(): Promise<PhishingCampaign[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('phishing_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PhishingCampaign[]
}

export async function fetchPhishingCampaign(id: string): Promise<PhishingCampaign | null> {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('phishing_campaigns').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as PhishingCampaign | null) ?? null
}

export async function createPhishingCampaign(
  input: PhishingCampaignInput,
  createdBy: string
): Promise<PhishingCampaign> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('phishing_campaigns')
    .insert({
      ...input,
      body_text: input.body_text ?? '',
      created_by: createdBy,
      status: 'draft',
    })
    .select('*')
    .single()
  if (error) throw error
  return data as PhishingCampaign
}

export async function updatePhishingCampaign(
  id: string,
  input: Partial<PhishingCampaignInput>
): Promise<PhishingCampaign> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('phishing_campaigns')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as PhishingCampaign
}

export async function deletePhishingCampaign(id: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.from('phishing_campaigns').delete().eq('id', id)
  if (error) throw error
}

async function resolveTargetUserIds(campaign: PhishingCampaign): Promise<string[]> {
  if (campaign.target_scope === 'custom') {
    return campaign.target_user_ids ?? []
  }

  const profiles = await fetchProfiles({
    orgId: campaign.target_scope === 'org' ? campaign.org_id ?? undefined : undefined,
    includeInactive: false,
    excludeAdmins: campaign.exclude_admins,
  })

  return profiles.map((p) => p.id)
}

export async function syncPhishingRecipients(campaign: PhishingCampaign): Promise<PhishingRecipient[]> {
  if (campaign.status !== 'draft') {
    throw new Error('Recipients can only be changed while the campaign is a draft.')
  }

  const supabase = requireSupabase()
  const userIds = await resolveTargetUserIds(campaign)
  if (userIds.length === 0) {
    throw new Error('No recipients match the selected audience.')
  }

  const { error: deleteError } = await supabase
    .from('phishing_recipients')
    .delete()
    .eq('campaign_id', campaign.id)
  if (deleteError) throw deleteError

  const rows = userIds.map((user_id) => ({
    campaign_id: campaign.id,
    user_id,
  }))

  const { data, error } = await supabase.from('phishing_recipients').insert(rows).select('*')
  if (error) throw error
  return (data ?? []) as PhishingRecipient[]
}

export async function fetchPhishingRecipients(campaignId: string): Promise<PhishingRecipientRow[]> {
  const supabase = requireSupabase()
  const { data: recipients, error } = await supabase
    .from('phishing_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at')
  if (error) throw error

  const rows = (recipients ?? []) as PhishingRecipient[]
  if (rows.length === 0) return []

  const userIds = rows.map((r) => r.user_id)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, org_id')
    .in('id', userIds)
  if (profilesError) throw profilesError

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))
  return rows.map((recipient) => ({
    ...recipient,
    profile: profileById.get(recipient.user_id),
  }))
}

export async function fetchPhishingEvents(campaignId: string): Promise<PhishingEvent[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('phishing_events')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PhishingEvent[]
}

export async function fetchPhishingEventByToken(token: string): Promise<{
  redFlags: string[]
  campaignName: string
}> {
  const supabase = requireSupabase()
  const { data: recipient, error: recipientError } = await supabase
    .from('phishing_recipients')
    .select('id, campaign_id')
    .eq('token', token)
    .maybeSingle()
  if (recipientError) throw recipientError
  if (!recipient) {
    return { redFlags: [], campaignName: '' }
  }

  const { data: campaign } = await supabase
    .from('phishing_campaigns')
    .select('name, template_id')
    .eq('id', recipient.campaign_id)
    .maybeSingle()

  let redFlags: string[] = []
  if (campaign?.template_id) {
    const { data: template } = await supabase
      .from('phishing_templates')
      .select('red_flags')
      .eq('id', campaign.template_id)
      .maybeSingle()
    if (Array.isArray(template?.red_flags)) {
      redFlags = template.red_flags as string[]
    }
  }

  return {
    redFlags,
    campaignName: campaign?.name ?? 'Security awareness test',
  }
}

export async function recordPhishingTrainingViewed(token: string): Promise<void> {
  const baseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!baseUrl || !anonKey) return

  try {
    await fetch(
      `${baseUrl}/functions/v1/track-phishing-event?token=${encodeURIComponent(token)}&event=training_viewed`,
      { method: 'GET', headers: { apikey: anonKey } }
    )
  } catch {
    // Non-blocking for the training page UX.
  }
}

export async function sendPhishingCampaign(
  campaignId: string,
  options: SendPhishingCampaignOptions = {}
): Promise<SendPhishingCampaignResult> {
  const supabase = getSupabase()
  const baseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!supabase || !baseUrl || !anonKey) throw new Error('Supabase is not configured.')

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) {
    throw new Error('You must be signed in as a platform admin.')
  }

  const body: Record<string, unknown> = { campaign_id: campaignId }
  if (options.testMode) {
    body.test_mode = true
    if (options.recipientIds?.length) {
      body.recipient_ids = options.recipientIds
    }
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl}/functions/v1/send-phishing-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(EDGE_FUNCTION_DEPLOY_HINT)
  }

  const data = (await response.json().catch(() => null)) as
    | (SendPhishingCampaignResult & { error?: string })
    | { error?: string }
    | null

  if (!response.ok) {
    throw new Error(data && 'error' in data && data.error ? data.error : 'Could not send campaign.')
  }

  return data as SendPhishingCampaignResult
}

export function getDefaultFakeLoginUrl(): string {
  return `${getPublicAppUrl()}/phishing-sim/login.html`
}

export async function fetchAllPhishingEvents(): Promise<PhishingEvent[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('phishing_events')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PhishingEvent[]
}

export async function fetchAllPhishingRecipients(): Promise<PhishingRecipient[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('phishing_recipients').select('*')
  if (error) throw error
  return (data ?? []) as PhishingRecipient[]
}
