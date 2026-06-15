import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchHospitalOrganizations } from '@/services/organizations.service'
import {
  fetchAllPhishingEvents,
  fetchAllPhishingRecipients,
  fetchPhishingCampaigns,
} from '@/services/phishing.service'
import { buildOrgPhishingSummaries } from '@/lib/phishing-stats'

export function PhishingDashboardPage() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['phishing-campaigns'],
    queryFn: fetchPhishingCampaigns,
  })

  const { data: recipients = [] } = useQuery({
    queryKey: ['phishing-recipients-all'],
    queryFn: fetchAllPhishingRecipients,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['phishing-events-all'],
    queryFn: fetchAllPhishingEvents,
  })

  const { data: hospitals = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchHospitalOrganizations,
  })

  const orgNameById = useMemo(
    () => new Map(hospitals.map((h) => [h.id, h.name])),
    [hospitals]
  )

  const recipientsByCampaign = useMemo(() => {
    const map = new Map<string, typeof recipients>()
    for (const r of recipients) {
      const list = map.get(r.campaign_id) ?? []
      list.push(r)
      map.set(r.campaign_id, list)
    }
    return map
  }, [recipients])

  const eventsByCampaign = useMemo(() => {
    const map = new Map<string, typeof events>()
    for (const e of events) {
      const list = map.get(e.campaign_id) ?? []
      list.push(e)
      map.set(e.campaign_id, list)
    }
    return map
  }, [events])

  const orgSummaries = useMemo(
    () => buildOrgPhishingSummaries(campaigns, recipientsByCampaign, eventsByCampaign, orgNameById),
    [campaigns, recipientsByCampaign, eventsByCampaign, orgNameById]
  )

  const sentCampaigns = campaigns.filter((c) => c.status === 'sent' || c.status === 'complete').length

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/phishing/campaigns">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Campaigns
        </Link>
      </Button>

      <PageHeader
        title="Phishing susceptibility"
        description="Susceptibility score = % of recipients who clicked or submitted credentials. Target benchmark: below 5% after sustained training."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Campaigns sent</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{sentCampaigns}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total events logged</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{events.length}</CardContent>
        </Card>
      </div>

      {orgSummaries.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No sent campaigns yet. Create a campaign and run a dry-run send to populate metrics.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="p-3">Organization</th>
                <th className="p-3">Campaigns</th>
                <th className="p-3">Emails sent</th>
                <th className="p-3">Susceptible</th>
                <th className="p-3">Susceptibility score</th>
              </tr>
            </thead>
            <tbody>
              {orgSummaries.map((row) => (
                <tr key={row.orgId} className="border-b last:border-0">
                  <td className="p-3 font-medium">{row.orgName}</td>
                  <td className="p-3">{row.campaignCount}</td>
                  <td className="p-3">{row.sentCount}</td>
                  <td className="p-3">{row.susceptibleCount}</td>
                  <td className="p-3 font-semibold">{row.susceptibilityScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
