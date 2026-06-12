import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isBackendReady } from '@/backend'
import { BACKEND_NOT_CONFIGURED_MESSAGE } from '@/lib/backend-config'
import { useRecoveryAuthSession } from '@/hooks/useRecoveryAuthSession'
import { signOut, updatePassword } from '@/services/auth.service'
import { isPasswordLongEnough, MIN_PASSWORD_LENGTH, passwordLengthError } from '@/lib/password'

function parseHashError(): string | null {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash.includes('error=')) return null
  const params = new URLSearchParams(hash)
  const description = params.get('error_description')
  if (description) return description.replace(/\+/g, ' ')
  const code = params.get('error_code')
  if (code === 'otp_expired') {
    return 'This reset link is invalid or has expired. Request a new one from the forgot-password page.'
  }
  return 'Could not verify this reset link. Request a new one.'
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const linkError = parseHashError()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { ready, checking } = useRecoveryAuthSession()

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
      await signOut()
      navigate('/login', {
        replace: true,
        state: { message: 'Password updated. Sign in with your new password.' },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>Enter a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isBackendReady() && (
            <p className="text-sm text-destructive">{BACKEND_NOT_CONFIGURED_MESSAGE}</p>
          )}

          {linkError && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{linkError}</p>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Request a new reset link
              </Link>
            </div>
          )}

          {!linkError && checking && (
            <p className="text-sm text-muted-foreground">Verifying reset link…</p>
          )}

          {!linkError && !checking && !ready && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                This reset link is invalid or has expired. Request a new one from the app (not from
                localhost).
              </p>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Request a new reset link
              </Link>
            </div>
          )}

          {!linkError && ready && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
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
                {saving ? 'Saving…' : 'Update password'}
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
