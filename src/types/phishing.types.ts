export type PhishingPretext =
  | 'it_helpdesk'
  | 'hr'
  | 'docusign'
  | 'executive'
  | 'payroll'
  | 'microsoft'

export type PhishingCampaignStatus = 'draft' | 'scheduled' | 'sent' | 'complete'

export type PhishingTargetScope = 'all' | 'org' | 'custom'

export type PhishingEventType = 'open' | 'click' | 'credential_submission' | 'training_viewed'

export type PhishingDifficulty = 'easy' | 'medium' | 'hard'

export interface PhishingTemplate {
  id: string
  name: string
  pretext: PhishingPretext | string
  sender_name: string
  sender_email_local: string
  subject: string
  body_html: string
  body_text: string
  difficulty: PhishingDifficulty
  red_flags: string[]
  thumbnail_url: string | null
  is_active: boolean
  created_at: string
}

export interface PhishingCampaign {
  id: string
  org_id: string | null
  template_id: string | null
  created_by: string | null
  name: string
  subject: string
  sender_name: string
  sender_email: string
  body_html: string
  body_text: string
  pretext: string | null
  fake_login_url: string | null
  track_opens: boolean
  target_scope: PhishingTargetScope
  target_user_ids: string[]
  exclude_admins: boolean
  deadline_date: string | null
  status: PhishingCampaignStatus
  scheduled_at: string | null
  sent_at: string | null
  auto_remediate: boolean
  remediation_course_id: string | null
  created_at: string
  updated_at: string
}

export interface PhishingRecipient {
  id: string
  campaign_id: string
  user_id: string
  token: string
  sent_at: string | null
  created_at: string
}

export interface PhishingEvent {
  id: string
  campaign_id: string
  recipient_id: string
  user_id: string
  event_type: PhishingEventType
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface PhishingRecipientRow extends PhishingRecipient {
  profile?: {
    full_name: string
    email: string | null
    org_id: string
  }
}

export interface PhishingCampaignInput {
  name: string
  subject: string
  sender_name: string
  sender_email: string
  body_html: string
  body_text?: string
  pretext?: string | null
  fake_login_url?: string | null
  track_opens?: boolean
  org_id?: string | null
  template_id?: string | null
  target_scope: PhishingTargetScope
  target_user_ids?: string[]
  exclude_admins?: boolean
  deadline_date?: string | null
  scheduled_at?: string | null
}

export interface SendPhishingCampaignResult {
  success: boolean
  dry_run: boolean
  email_sent: boolean
  sent_count: number
  failed_count: number
  failures: { email: string; error: string }[]
  message: string
}

export const PHISHING_PRETEXT_LABELS: Record<string, string> = {
  it_helpdesk: 'IT Helpdesk',
  hr: 'HR / Benefits',
  docusign: 'DocuSign',
  executive: 'Executive request',
  payroll: 'Payroll',
  microsoft: 'Microsoft security',
}
