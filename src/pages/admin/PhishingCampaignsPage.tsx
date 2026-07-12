import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, BarChart3, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { fetchPhishingCampaigns, deletePhishingCampaign } from '@/services/phishing.service'
import { usePhishingBasePath } from '@/lib/phishing-paths'
import { formatDate } from '@/lib/utils'
import type { PhishingCampaignStatus } from '@/types/phishing.types'

const statusVariant: Record<PhishingCampaignStatus, 'secondary' | 'default' | 'success' | 'warning'> = {
  draft: 'secondary',
  scheduled: 'warning',
  sent: 'default',
  complete: 'success',
}

export function PhishingCampaignsPage() {
  const base = usePhishingBasePath()
  const queryClient = useQueryClient()
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['phishing-campaigns'],
    queryFn: fetchPhishingCampaigns,
  })

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? All recipients and results will be permanently removed.`)) {
      return
    }
    await deletePhishingCampaign(id)
    await queryClient.invalidateQueries({ queryKey: ['phishing-campaigns'] })
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Phishing campaigns"
        description="Build and run authorized security awareness simulations on your verified domain."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/dashboard`}>
                <BarChart3 className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={`${base}/campaigns/new/edit`}>
                <Plus className="h-4 w-4 mr-1" />
                New campaign
              </Link>
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No campaigns yet. Create one from a template, select recipients, then send.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="p-3">Name</th>
                <th className="p-3">Pretext</th>
                <th className="p-3">Status</th>
                <th className="p-3">Sent</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{campaign.name}</td>
                  <td className="p-3 capitalize text-muted-foreground">{campaign.pretext ?? '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={statusVariant[campaign.status]}>{campaign.status}</Badge>
                      {campaign.test_mode && campaign.status === 'draft' && (
                        <Badge variant="warning">Test mode</Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {campaign.sent_at ? formatDate(campaign.sent_at) : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`${base}/campaigns/${campaign.id}`}>Results</Link>
                      </Button>
                      {campaign.status === 'draft' && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`${base}/campaigns/${campaign.id}/edit`}>Edit</Link>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(campaign.id, campaign.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
