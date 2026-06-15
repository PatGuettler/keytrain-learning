import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FlaskConical, Send } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  fetchPhishingCampaign,
  fetchPhishingEvents,
  fetchPhishingRecipients,
  sendPhishingCampaign,
} from '@/services/phishing.service'
import { buildRecipientOutcomes, computeCampaignMetrics } from '@/lib/phishing-stats'
import { formatDate } from '@/lib/utils'

export function PhishingCampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const queryClient = useQueryClient()
  const [sending, setSending] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [sendMessage, setSendMessage] = useState('')
  const [sendError, setSendError] = useState('')
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set())

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['phishing-campaign', campaignId],
    queryFn: () => fetchPhishingCampaign(campaignId!),
    enabled: Boolean(campaignId),
  })

  const { data: recipients = [] } = useQuery({
    queryKey: ['phishing-recipients', campaignId],
    queryFn: () => fetchPhishingRecipients(campaignId!),
    enabled: Boolean(campaignId),
  })

  const { data: events = [] } = useQuery({
    queryKey: ['phishing-events', campaignId],
    queryFn: () => fetchPhishingEvents(campaignId!),
    enabled: Boolean(campaignId),
  })

  const metrics = computeCampaignMetrics(recipients, events)
  const outcomes = buildRecipientOutcomes(recipients, events)
  const isDraft = campaign?.status === 'draft'
  const testSentCount = recipients.filter((r) => r.test_sent_at).length

  const allSelected =
    recipients.length > 0 && recipients.every((r) => selectedTestIds.has(r.id))

  const toggleTestRecipient = (id: string) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllForTest = () => {
    if (allSelected) {
      setSelectedTestIds(new Set())
    } else {
      setSelectedTestIds(new Set(recipients.map((r) => r.id)))
    }
  }

  const statusDescription = useMemo(() => {
    if (!campaign) return ''
    const parts = [`Status: ${campaign.status}`]
    if (campaign.test_mode) parts.push('Test mode')
    if (campaign.sent_at) parts.push(`Sent ${formatDate(campaign.sent_at)}`)
    if (testSentCount > 0 && isDraft) parts.push(`${testSentCount} test sent`)
    return parts.join(' · ')
  }, [campaign, isDraft, testSentCount])

  const handleTestSend = async () => {
    if (!campaignId || selectedTestIds.size === 0) return
    const count = selectedTestIds.size
    if (
      !window.confirm(
        `Send a test to ${count} selected recipient${count === 1 ? '' : 's'}? The campaign will stay a draft.`
      )
    ) {
      return
    }
    setTestSending(true)
    setSendError('')
    setSendMessage('')
    try {
      const result = await sendPhishingCampaign(campaignId, {
        testMode: true,
        recipientIds: [...selectedTestIds],
      })
      setSendMessage(result.message)
      await queryClient.invalidateQueries({ queryKey: ['phishing-campaign', campaignId] })
      await queryClient.invalidateQueries({ queryKey: ['phishing-campaigns'] })
      await queryClient.invalidateQueries({ queryKey: ['phishing-recipients', campaignId] })
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Test send failed.')
    } finally {
      setTestSending(false)
    }
  }

  const handleSend = async () => {
    if (!campaignId) return
    if (
      !window.confirm(
        `Send this campaign to all ${recipients.length} recipients? This cannot be undone. (Dry-run if email is not configured.)`
      )
    ) {
      return
    }
    setSending(true)
    setSendError('')
    setSendMessage('')
    try {
      const result = await sendPhishingCampaign(campaignId)
      setSendMessage(result.message)
      await queryClient.invalidateQueries({ queryKey: ['phishing-campaign', campaignId] })
      await queryClient.invalidateQueries({ queryKey: ['phishing-campaigns'] })
      await queryClient.invalidateQueries({ queryKey: ['phishing-recipients', campaignId] })
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Send failed.')
    } finally {
      setSending(false)
    }
  }

  if (isLoading || !campaign) {
    return <p className="text-sm text-muted-foreground">Loading campaign…</p>
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/phishing/campaigns">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Campaigns
        </Link>
      </Button>

      <PageHeader
        title={campaign.name}
        description={statusDescription}
        action={
          isDraft ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/admin/phishing/campaigns/${campaign.id}/edit`}>Edit</Link>
              </Button>
              <Button size="sm" onClick={handleSend} disabled={sending || recipients.length === 0}>
                <Send className="h-4 w-4 mr-1" />
                {sending ? 'Sending…' : 'Send to everyone'}
              </Button>
            </div>
          ) : undefined
        }
      />

      {sendMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{sendMessage}</p>}
      {sendError && <p className="text-sm text-destructive">{sendError}</p>}

      {isDraft && recipients.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-amber-600" />
              Test send
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select one or more recipients to verify the email, links, and tracking before sending
              to the full audience. Test sends do not change campaign status.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllForTest}
                type="button"
              >
                {allSelected ? 'Clear selection' : 'Select all'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleTestSend}
                disabled={testSending || selectedTestIds.size === 0}
              >
                <FlaskConical className="h-4 w-4 mr-1" />
                {testSending
                  ? 'Sending test…'
                  : `Send test (${selectedTestIds.size})`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Recipients</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{metrics.recipientCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Production sent</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{metrics.sentCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Test sent</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{testSentCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Click rate</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{metrics.clickRate}%</CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Open rate: {metrics.openRate}% · Credential submits: {metrics.credentialRate}% — open
        tracking is unreliable in many email clients.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              {isDraft && <th className="p-3 w-10">Test</th>}
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Test sent</th>
              <th className="p-3">Prod sent</th>
              <th className="p-3">Opened</th>
              <th className="p-3">Clicked</th>
              <th className="p-3">Credentials</th>
              <th className="p-3">Training</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map(({ recipient, opened, clicked, submittedCredentials, viewedTraining }) => (
              <tr key={recipient.id} className="border-b last:border-0">
                {isDraft && (
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedTestIds.has(recipient.id)}
                      onChange={() => toggleTestRecipient(recipient.id)}
                      aria-label={`Select ${recipient.profile?.full_name ?? 'recipient'} for test send`}
                    />
                  </td>
                )}
                <td className="p-3 font-medium">{recipient.profile?.full_name ?? '—'}</td>
                <td className="p-3 text-muted-foreground">{recipient.profile?.email ?? '—'}</td>
                <td className="p-3 whitespace-nowrap">
                  {recipient.test_sent_at ? (
                    <Badge variant="warning">{formatDate(recipient.test_sent_at)}</Badge>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {recipient.sent_at ? formatDate(recipient.sent_at) : '—'}
                </td>
                <td className="p-3">{opened ? <Badge variant="secondary">Yes</Badge> : '—'}</td>
                <td className="p-3">{clicked ? <Badge variant="warning">Yes</Badge> : '—'}</td>
                <td className="p-3">
                  {submittedCredentials ? <Badge variant="destructive">Yes</Badge> : '—'}
                </td>
                <td className="p-3">{viewedTraining ? <Badge variant="success">Yes</Badge> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
