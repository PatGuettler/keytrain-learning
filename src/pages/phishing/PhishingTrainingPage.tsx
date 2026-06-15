import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchPhishingEventByToken, recordPhishingTrainingViewed } from '@/services/phishing.service'

export function PhishingTrainingPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [redFlags, setRedFlags] = useState<string[]>([])
  const [campaignName, setCampaignName] = useState('Security awareness test')
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return

    let cancelled = false
    const load = async () => {
      try {
        const result = await fetchPhishingEventByToken(token)
        if (cancelled) return
        setRedFlags(result.redFlags)
        if (result.campaignName) setCampaignName(result.campaignName)
        await recordPhishingTrainingViewed(token)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background to-amber-500/10 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Shield className="h-12 w-12 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">This was a security awareness test</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading…'
              : `You interacted with a simulated phishing email (${campaignName}). No credentials were stored.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Real attackers use urgency, familiar branding, and fake login pages to steal credentials.
            You are not in trouble — this exercise helps your organization stay safe.
          </p>

          {redFlags.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium">Red flags in this email</p>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                {redFlags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          <Button asChild className="w-full">
            <Link to="/login">Return to GuardianMD sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
