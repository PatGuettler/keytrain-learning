import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isBackendReady } from '@/backend'
import { BACKEND_NOT_CONFIGURED_MESSAGE } from '@/lib/backend-config'
import { ROLE_DASHBOARD } from '@/lib/constants'
import { useRecoveryAuthSession } from '@/hooks/useRecoveryAuthSession'
import { completeInvitationRegistration, signIn, updatePassword } from '@/services/auth.service'
import { syncRequiredAssignmentsForUser } from '@/services/assignments.service'
import { useAuthStore } from '@/store/authStore'
import { isPasswordLongEnough, MIN_PASSWORD_LENGTH, PASSWORD_CRITERIA_HINT, passwordLengthError } from '@/lib/password'

function parseHashError(): string | null {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash.includes('error=')) return null
  const params = new URLSearchParams(hash)
  const description = params.get('error_description')
  if (description) return description.replace(/\+/g, ' ')
  const code = params.get('error_code')
  if (code === 'otp_expired') {
    return 'This invitation link is invalid or has already been used. Corporate email scanners often open links before you do — ask your administrator to delete the invited user and send a new invite, or use password reset if you already set a password.'
  }
  return 'Could not verify this invitation. Ask your administrator to send a new invite.'
}

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const linkError = parseHashError()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { ready, checking, sessionEmail } = useRecoveryAuthSession()

  const passwordTooShort = password.length > 0 && !isPasswordLongEnough(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isPasswordLongEnough(password)) {
      setError(passwordLengthError())
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    try {
      await updatePassword(password)
      await completeInvitationRegistration()

      // Password changes can invalidate the invite/recovery session. Sign in with
      // the new password so grant_type=password works after logout.
      const emailForLogin = (sessionEmail ?? '').trim().toLowerCase()
      if (!emailForLogin) {
        throw new Error('Could not determine account email. Use Forgot password on the login page.')
      }

      const result = await signIn(emailForLogin, password)
      let profile = result.profile
      profile = { ...profile, invitation_pending: false }

      if (profile.role !== 'admin') {
        await syncRequiredAssignmentsForUser(result.user.id)
      }

      setAuth({
        userId: result.user.id,
        email: result.user.email ?? emailForLogin,
        profile,
      })

      navigate(ROLE_DASHBOARD[profile.role] ?? '/employee/training', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept invitation</CardTitle>
          <CardDescription>Choose a password to finish setting up your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isBackendReady() && (
            <p className="text-sm text-destructive">{BACKEND_NOT_CONFIGURED_MESSAGE}</p>
          )}

          {linkError && <p className="text-sm text-destructive">{linkError}</p>}

          {!linkError && checking && (
            <p className="text-sm text-muted-foreground">Verifying invitation…</p>
          )}

          {!linkError && !checking && !ready && (
            <p className="text-sm text-destructive">
              This invitation link is invalid or has expired. Ask your administrator to delete your
              user and send a new invite from the production app.
            </p>
          )}

          {!linkError && ready && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {sessionEmail && (
                <p className="text-sm text-muted-foreground">
                  Setting up account for <span className="font-medium text-foreground">{sessionEmail}</span>
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="invite-password">Password</Label>
                <Input
                  id="invite-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  autoComplete="new-password"
                />
                {passwordTooShort && (
                  <p className="text-sm text-amber-600 dark:text-amber-500">{PASSWORD_CRITERIA_HINT}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-confirm-password">Confirm password</Label>
                <Input
                  id="invite-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Saving…' : 'Create account and continue'}
              </Button>
            </form>
          )}

          <Link to="/login" className="text-sm text-primary inline-block hover:underline">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
