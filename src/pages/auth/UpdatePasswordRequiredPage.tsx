import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLogo } from '@/components/brand/AppLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { APP_NAME, ROLE_DASHBOARD } from '@/lib/constants'
import {
  isPasswordLongEnough,
  MIN_PASSWORD_LENGTH,
  PASSWORD_CRITERIA_HINT,
  PASSWORD_UPGRADE_MESSAGE,
  passwordLengthError,
} from '@/lib/password'
import { fetchProfile, updatePassword } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

export function UpdatePasswordRequiredPage() {
  const navigate = useNavigate()
  const email = useAuthStore((s) => s.email)
  const userId = useAuthStore((s) => s.userId)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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
      if (!userId) throw new Error('Not signed in.')
      const profile = await fetchProfile(userId)
      setAuth({ userId, email: email ?? '', profile })
      navigate(ROLE_DASHBOARD[profile.role], { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background to-accent/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <AppLogo className="h-20 w-auto" />
          </div>
          <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
          <CardDescription>{PASSWORD_UPGRADE_MESSAGE}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upgrade-password">New password</Label>
              <Input
                id="upgrade-password"
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
              <Label htmlFor="upgrade-confirm-password">Confirm password</Label>
              <Input
                id="upgrade-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
                required
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full min-h-12" disabled={saving}>
              {saving ? 'Saving…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
