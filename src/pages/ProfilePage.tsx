import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { fetchProfiles } from '@/services/users.service'
import { submitSupportRequest } from '@/services/support.service'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function ProfilePage() {
  const profile = useAuthStore((s) => s.profile)
  const userId = useAuthStore((s) => s.userId)!

  const { data: manager } = useQuery({
    queryKey: ['profile-manager', profile?.manager_id],
    queryFn: () => fetchProfiles({ orgId: profile!.org_id, includeInactive: true }),
    enabled: Boolean(profile?.manager_id && profile?.org_id),
    select: (rows) => rows.find((p) => p.id === profile?.manager_id) ?? null,
  })

  const [category, setCategory] = useState<'bug' | 'feature' | 'question' | 'other'>('question')
  const [subject, setSubject] = useState('')
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
      const result = await submitSupportRequest({ category, subject, message })
      setSuccess(result.message)
      setSubject('')
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send request')
    } finally {
      setLoading(false)
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
            <span className="text-muted-foreground">Role:</span>{' '}
            <span className="capitalize">{profile.role}</span>
          </p>
          {profile.role !== 'admin' && (
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
          <CardTitle className="text-base">Contact</CardTitle>
          <CardDescription>
            Report bugs, request features, or ask questions. Your profile details are included automatically.
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
                onChange={(e) => setCategory(e.target.value as typeof category)}
              >
                <option value="bug">Bug report</option>
                <option value="feature">Feature request</option>
                <option value="question">General question</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-subject">Subject</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
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
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
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
