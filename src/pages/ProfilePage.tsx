import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { ThemeSelectorButtons } from '@/components/layout/ThemeSelector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/store/authStore'
import { fetchProfiles } from '@/services/users.service'
import { fetchOrganizationById } from '@/services/organizations.service'
import { submitSupportRequest } from '@/services/support.service'
import { updateDailyVerseEnabled } from '@/services/daily-verse.service'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_PRAYER } from '@/lib/constants'
import { SPIRITUAL_FEATURES_ENABLED } from '@/lib/spiritual-features'
import {
  SUPPORT_CATEGORIES,
  TRAINING_REQUEST_GUIDANCE,
  TRAINING_REQUEST_MESSAGE_TEMPLATE,
  TRAINING_REQUEST_SUBJECT_SUGGESTION,
  type SupportCategory,
} from '@/lib/support-categories'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function roleLabel(role: string) {
  if (role === 'org_admin') return 'Org admin'
  if (role === 'admin') return 'KeyTrain Learning admin'
  return role
}

export function ProfilePage() {
  const profile = useAuthStore((s) => s.profile)
  const userId = useAuthStore((s) => s.userId)!
  const email = useAuthStore((s) => s.email)
  const setAuth = useAuthStore((s) => s.setAuth)
  const { role } = useAuth()
  const prayerPath = role ? ROLE_PRAYER[role] : '/employee/prayer'

  const belongsToOrg = profile?.role === 'employee' || profile?.role === 'manager'

  const { data: organization } = useQuery({
    queryKey: ['profile-organization', profile?.org_id],
    queryFn: () => fetchOrganizationById(profile!.org_id),
    enabled: Boolean(belongsToOrg && profile?.org_id),
  })

  const { data: manager } = useQuery({
    queryKey: ['profile-manager', profile?.manager_id],
    queryFn: () => fetchProfiles({ orgId: profile!.org_id, includeInactive: true }),
    enabled: Boolean(profile?.manager_id && profile?.org_id && belongsToOrg),
    select: (rows) => rows.find((p) => p.id === profile?.manager_id) ?? null,
  })


  const [category, setCategory] = useState<SupportCategory>('question')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deliveryWarning, setDeliveryWarning] = useState('')
  const [verseToggleLoading, setVerseToggleLoading] = useState(false)
  const [verseToggleError, setVerseToggleError] = useState('')

  const handleCategoryChange = (next: SupportCategory) => {
    setCategory(next)
    if (next === 'training_request') {
      if (!subject.trim()) {
        setSubject(TRAINING_REQUEST_SUBJECT_SUGGESTION)
      }
      if (!message.trim()) {
        setMessage(TRAINING_REQUEST_MESSAGE_TEMPLATE)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    setDeliveryWarning('')
    try {
      const result = await submitSupportRequest({ category, subject, message })
      setSuccess(result.message)
      if (result.saved && !result.emailSent) {
        setDeliveryWarning(
          'Your message was saved, but email was not delivered. Ask your admin to set RESEND_API_KEY and redeploy send-support-request.'
        )
      }
      setSubject('')
      setMessage('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send request'
      setError(message)
      setSuccess('')
    } finally {
      setLoading(false)
    }
  }

  const handleDailyVerseToggle = async (enabled: boolean) => {
    if (!profile || !email) return
    setVerseToggleLoading(true)
    setVerseToggleError('')
    try {
      const updated = await updateDailyVerseEnabled(userId, enabled)
      setAuth({ userId, email, profile: updated })
    } catch (err) {
      setVerseToggleError(err instanceof Error ? err.message : 'Could not update preference.')
    } finally {
      setVerseToggleLoading(false)
    }
  }

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Profile not available.</p>
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      <PageHeader title="My profile" description="Your account details and contact form." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {profile.full_name}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {profile.email ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Role:</span> {roleLabel(profile.role)}
          </p>
          {belongsToOrg && (
            <p>
              <span className="text-muted-foreground">Organization:</span>{' '}
              {organization?.name ?? (profile.org_id ? 'Loading…' : '—')}
            </p>
          )}
          {belongsToOrg && (
            <p>
              <span className="text-muted-foreground">Manager:</span>{' '}
              {manager?.full_name ?? 'Not assigned'}
            </p>
          )}
          <p className="font-mono text-xs text-muted-foreground break-all">User ID: {userId}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
          <CardDescription>Choose light, dark, or match your system setting.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelectorButtons />
        </CardContent>
      </Card>

      {SPIRITUAL_FEATURES_ENABLED && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Bible Verse</CardTitle>
              <CardDescription>
                Show a Bible verse once per day when you sign in. You can dismiss it each day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="daily-verse-toggle" className="text-sm font-normal">
                  {profile.daily_verse_enabled !== false ? 'Enabled' : 'Disabled'}
                </Label>
                <Switch
                  id="daily-verse-toggle"
                  checked={profile.daily_verse_enabled !== false}
                  disabled={verseToggleLoading}
                  onCheckedChange={handleDailyVerseToggle}
                />
              </div>
              {verseToggleError && <p className="text-sm text-destructive">{verseToggleError}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prayer</CardTitle>
              <CardDescription>
                Submit an anonymous prayer request for our team to lift up in prayer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to={prayerPath}>Go to Prayer</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
          <CardDescription>
            Report bugs, request features, ask questions, or ask us to build custom training from
            your KeyTrain and RailNet insights. Your profile details are included automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="support-category">Category</Label>
              <select
                id="support-category"
                className={selectClass}
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as SupportCategory)}
              >
                {SUPPORT_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {category === 'training_request' && (
              <div
                className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm space-y-2"
                role="note"
              >
                <p className="font-medium text-foreground">
                  Help us build training tailored to your organization
                </p>
                <p className="text-muted-foreground">
                  If KeyTrain or RailNet surfaced alerts, weak scores, or trends you want addressed,
                  tell us what you saw and who should be trained. The message below is a starting
                  template — edit or replace any section.
                </p>
                <p className="text-muted-foreground font-medium">Please include:</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                  {TRAINING_REQUEST_GUIDANCE.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="support-subject">Subject</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  category === 'training_request'
                    ? 'e.g. Phishing training after Q2 alert spike'
                    : undefined
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-message">Message</Label>
              <textarea
                id="support-message"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={category === 'training_request' ? 16 : undefined}
                placeholder={
                  category === 'training_request'
                    ? 'Use the template above or write your own — the more specific, the better.'
                    : undefined
                }
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {deliveryWarning && (
              <p className="text-sm text-amber-600 dark:text-amber-500">{deliveryWarning}</p>
            )}
            {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Submit'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
