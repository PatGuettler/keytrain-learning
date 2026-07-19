import {
  addDataTable,
  addMetricsSection,
  addSectionHeading,
  createDashboardPdf,
  pdfStartY,
  saveDashboardPdf,
} from '@/lib/pdf/pdf-base'
import { susceptibilityScore, susceptibleRecipientCount } from '@/lib/phishing-stats'
import type { CampaignMetrics, RecipientOutcome } from '@/lib/phishing-stats'
import { formatDate } from '@/lib/utils'
import type { PhishingCampaign, PhishingEvent } from '@/types/phishing.types'

function yesNo(value: boolean): string {
  return value ? 'Yes' : '—'
}

/** Per-campaign phishing results report. */
export function exportPhishingCampaignPdf(
  campaign: PhishingCampaign,
  metrics: CampaignMetrics,
  outcomes: RecipientOutcome[],
  events: PhishingEvent[],
  orgName?: string
) {
  const subtitleParts = [`Status: ${campaign.status}`]
  if (campaign.sent_at) subtitleParts.push(`Sent ${formatDate(campaign.sent_at)}`)
  if (orgName) subtitleParts.push(orgName)
  const subtitle = subtitleParts.join('  ·  ')

  const doc = createDashboardPdf(`Phishing campaign — ${campaign.name}`, subtitle)
  let y = pdfStartY(subtitle)

  const testSentCount = outcomes.filter((o) => o.recipient.test_sent_at).length
  const susceptible = susceptibleRecipientCount([], events)
  const score = susceptibilityScore(metrics.sentCount, susceptible)

  y = addMetricsSection(
    doc,
    [
      { label: 'Recipients', value: String(metrics.recipientCount) },
      { label: 'Production sent', value: String(metrics.sentCount) },
      { label: 'Test sent', value: String(testSentCount) },
      { label: 'Opened', value: `${metrics.openCount} (${metrics.openRate}%)` },
      { label: 'Clicked', value: `${metrics.clickCount} (${metrics.clickRate}%)` },
      {
        label: 'Credentials submitted',
        value: `${metrics.credentialCount} (${metrics.credentialRate}%)`,
      },
      {
        label: 'Training viewed',
        value: `${metrics.trainingViewedCount} (${metrics.trainingRate}%)`,
      },
      { label: 'Susceptible (clicked or submitted)', value: `${susceptible} (${score}%)` },
    ],
    y
  )

  if (campaign.pretext) {
    y = addSectionHeading(doc, 'Pretext', y)
    y = addDataTable(doc, ['Pretext'], [[campaign.pretext]], y)
  }

  y = addSectionHeading(doc, 'Recipient outcomes', y)
  addDataTable(
    doc,
    ['Name', 'Email', 'Test sent', 'Prod sent', 'Opened', 'Clicked', 'Credentials', 'Training'],
    outcomes.map((o) => [
      o.recipient.profile?.full_name ?? '—',
      o.recipient.profile?.email ?? '—',
      o.recipient.test_sent_at ? formatDate(o.recipient.test_sent_at) : '—',
      o.recipient.sent_at ? formatDate(o.recipient.sent_at) : '—',
      yesNo(o.opened),
      yesNo(o.clicked),
      yesNo(o.submittedCredentials),
      yesNo(o.viewedTraining),
    ]),
    y
  )

  saveDashboardPdf(doc, `phishing-${campaign.name}`)
}
