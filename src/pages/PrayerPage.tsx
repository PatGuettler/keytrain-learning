import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { submitPrayerRequest } from '@/services/prayer.service'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_PROFILE } from '@/lib/constants'

const INTRO = `We are the body of Christ, His hands and feet in this world. As we move together in faith, never forget that you are intimately connected to a Holy God who loves you deeply.

Because we are members of this one body, please know that we are here for you. We are ready, willing, and truly grateful to pray for you in any way you need.`

const CORINTHIANS_ESV = `1 Corinthians 12:25–27 (ESV)

—so that there may be no division in the body, but that the members may have the same care for one another. If one member suffers, all suffer together; if one member is honored, all rejoice together. Now you are the body of Christ and individually members of it.`

const GALATIANS_ESV = `Galatians 6:2 (ESV)

Bear one another's burdens, and so fulfill the law of Christ.`

export function PrayerPage() {
  const { role } = useAuth()
  const profilePath = role ? ROLE_PROFILE[role] : '/employee/profile'

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const result = await submitPrayerRequest(message)
      setSuccess(result.message)
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit prayer request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      <PageHeader
        title="Prayer"
        description="Share a prayer request with our team. Your submission is completely anonymous."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">We are here for you</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm whitespace-pre-wrap">
          <p>{INTRO}</p>
          <div className="space-y-3 rounded-md border bg-muted/40 p-4">
            <p className="font-medium">Supporting Bible Verses</p>
            <p className="text-muted-foreground">{CORINTHIANS_ESV}</p>
            <p className="text-muted-foreground">{GALATIANS_ESV}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit a prayer request</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              Type your request below. Nothing you submit is linked to your account.
            </span>
            <span className="block">
              Note: This is a completely anonymous message. No personal data or user information is
              collected.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prayer-message">Your prayer request</Label>
              <textarea
                id="prayer-message"
                className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                placeholder="Share what you would like us to pray for…"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit prayer request'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to={profilePath}>Back to profile</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
