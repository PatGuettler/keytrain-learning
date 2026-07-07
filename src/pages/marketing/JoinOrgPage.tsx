import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isBackendReady } from '@/backend'
import { BACKEND_NOT_CONFIGURED_MESSAGE } from '@/lib/backend-config'
import {
  isPasswordLongEnough,
  MIN_PASSWORD_LENGTH,
  PASSWORD_CRITERIA_HINT,
} from '@/lib/password'
import { joinOrganizationWithCode } from '@/services/join-organization.service'

export function JoinOrgPage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordTooShort = password.length > 0 && !isPasswordLongEnough(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isPasswordLongEnough(password)) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const result = await joinOrganizationWithCode({
        join_code: joinCode.trim(),
        email: email.trim(),
        full_name: fullName.trim(),
        password,
      })
      navigate('/login', {
        replace: true,
        state: { message: result.message },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-16 sm:py-20">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Join your organization</h1>
        <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
          Enter the join code from your administrator plus your work email. The code ties your
          account to the correct organization — you cannot join without it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create your account</CardTitle>
          <CardDescription>
            Your org admin should have added a seat for you before sharing this code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isBackendReady() && (
            <p className="text-sm text-amber-600 dark:text-amber-500 mb-4">
              {BACKEND_NOT_CONFIGURED_MESSAGE}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="join-code">Organization join code</Label>
              <Input
                id="join-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                autoComplete="off"
                required
                disabled={loading}
                className="font-mono tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                From your admin — not your password. Each organization has its own code.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-email">Work email</Label>
              <Input
                id="join-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.org"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-name">Full name</Label>
              <Input
                id="join-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-password">Password</Label>
              <Input
                id="join-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              {passwordTooShort && (
                <p className="text-sm text-amber-600 dark:text-amber-500">{PASSWORD_CRITERIA_HINT}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-confirm">Confirm password</Label>
              <Input
                id="join-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isBackendReady()}
            >
              {loading ? 'Creating account…' : 'Join organization'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 space-y-3 text-center text-sm text-muted-foreground">
        <p>
          Got an email invite instead?{' '}
          <span className="text-foreground">Open the link in that email</span> — do not use this
          page. The link sets your password and confirms your org automatically.
        </p>
        <p>
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
