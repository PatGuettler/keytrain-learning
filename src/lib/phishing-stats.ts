import type {
  PhishingCampaign,
  PhishingEvent,
  PhishingRecipient,
  PhishingRecipientRow,
} from '@/types/phishing.types'

export interface CampaignMetrics {
  recipientCount: number
  sentCount: number
  openCount: number
  clickCount: number
  credentialCount: number
  trainingViewedCount: number
  openRate: number
  clickRate: number
  credentialRate: number
  trainingRate: number
}

export interface RecipientOutcome {
  recipient: PhishingRecipientRow
  opened: boolean
  clicked: boolean
  submittedCredentials: boolean
  viewedTraining: boolean
  worstEvent: 'none' | 'open' | 'click' | 'credential_submission' | 'training_viewed'
}

function uniqueRecipientsWithEvent(
  events: PhishingEvent[],
  eventType: PhishingEvent['event_type']
): number {
  const ids = new Set(
    events.filter((e) => e.event_type === eventType).map((e) => e.recipient_id)
  )
  return ids.size
}

export function computeCampaignMetrics(
  recipients: PhishingRecipient[],
  events: PhishingEvent[]
): CampaignMetrics {
  const sentCount = recipients.filter((r) => r.sent_at).length
  const denominator = sentCount || recipients.length || 1
  const openCount = uniqueRecipientsWithEvent(events, 'open')
  const clickCount = uniqueRecipientsWithEvent(events, 'click')
  const credentialCount = uniqueRecipientsWithEvent(events, 'credential_submission')
  const trainingViewedCount = uniqueRecipientsWithEvent(events, 'training_viewed')

  return {
    recipientCount: recipients.length,
    sentCount,
    openCount,
    clickCount,
    credentialCount,
    trainingViewedCount,
    openRate: Math.round((openCount / denominator) * 100),
    clickRate: Math.round((clickCount / denominator) * 100),
    credentialRate: Math.round((credentialCount / denominator) * 100),
    trainingRate: Math.round((trainingViewedCount / denominator) * 100),
  }
}

export function buildRecipientOutcomes(
  recipients: PhishingRecipientRow[],
  events: PhishingEvent[]
): RecipientOutcome[] {
  const eventsByRecipient = new Map<string, PhishingEvent[]>()
  for (const event of events) {
    const list = eventsByRecipient.get(event.recipient_id) ?? []
    list.push(event)
    eventsByRecipient.set(event.recipient_id, list)
  }

  return recipients.map((recipient) => {
    const list = eventsByRecipient.get(recipient.id) ?? []
    const opened = list.some((e) => e.event_type === 'open')
    const clicked = list.some((e) => e.event_type === 'click')
    const submittedCredentials = list.some((e) => e.event_type === 'credential_submission')
    const viewedTraining = list.some((e) => e.event_type === 'training_viewed')

    let worstEvent: RecipientOutcome['worstEvent'] = 'none'
    if (submittedCredentials) worstEvent = 'credential_submission'
    else if (clicked) worstEvent = 'click'
    else if (opened) worstEvent = 'open'
    else if (viewedTraining) worstEvent = 'training_viewed'

    return {
      recipient,
      opened,
      clicked,
      submittedCredentials,
      viewedTraining,
      worstEvent,
    }
  })
}

export function susceptibleRecipientCount(
  _recipients: PhishingRecipient[],
  events: PhishingEvent[]
): number {
  const susceptible = new Set<string>()
  for (const event of events) {
    if (event.event_type === 'click' || event.event_type === 'credential_submission') {
      susceptible.add(event.recipient_id)
    }
  }
  return susceptible.size
}

export function susceptibilityScore(sentCount: number, susceptibleCount: number): number {
  if (sentCount <= 0) return 0
  return Math.round((susceptibleCount / sentCount) * 100)
}

export interface OrgPhishingSummary {
  orgId: string
  orgName: string
  campaignCount: number
  sentCount: number
  susceptibleCount: number
  susceptibilityScore: number
}

export function buildOrgPhishingSummaries(
  campaigns: PhishingCampaign[],
  recipientsByCampaign: Map<string, PhishingRecipient[]>,
  eventsByCampaign: Map<string, PhishingEvent[]>,
  orgNameById: Map<string, string>
): OrgPhishingSummary[] {
  const byOrg = new Map<string, OrgPhishingSummary>()

  for (const campaign of campaigns) {
    if (campaign.status !== 'sent' && campaign.status !== 'complete') continue
    const orgId = campaign.org_id ?? 'unknown'
    const recipients = recipientsByCampaign.get(campaign.id) ?? []
    const events = eventsByCampaign.get(campaign.id) ?? []
    const sent = recipients.filter((r) => r.sent_at).length
    const susceptible = susceptibleRecipientCount(recipients, events)

    const existing = byOrg.get(orgId) ?? {
      orgId,
      orgName: orgNameById.get(orgId) ?? 'All organizations',
      campaignCount: 0,
      sentCount: 0,
      susceptibleCount: 0,
      susceptibilityScore: 0,
    }

    existing.campaignCount += 1
    existing.sentCount += sent
    existing.susceptibleCount += susceptible
    byOrg.set(orgId, existing)
  }

  return [...byOrg.values()]
    .map((row) => ({
      ...row,
      susceptibilityScore: susceptibilityScore(row.sentCount, row.susceptibleCount),
    }))
    .sort((a, b) => b.susceptibilityScore - a.susceptibilityScore)
}
