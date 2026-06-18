import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppLogo } from '@/components/brand/AppLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { APP_NAME, ROLE_DASHBOARD } from '@/lib/constants'
import { Link } from 'react-router-dom'
import { isBackendReady } from '@/backend'
import { BACKEND_NOT_CONFIGURED_MESSAGE } from '@/lib/backend-config'
import { useAuthStore } from '@/store/authStore'
import { ACCOUNT_LOCKED_MESSAGE, INVALID_LOGIN_MESSAGE, isPasswordLongEnough, LOGIN_SHORT_PASSWORD_HINT, PASSWORD_CRITERIA_HINT } from '@/lib/password'

const schema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const locationState = location.state as { from?: { pathname: string }; message?: string } | null
  const from = locationState?.from?.pathname
  const successMessage = locationState?.message

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const passwordValue = watch('password')
  const passwordTooShort = passwordValue.length > 0 && !isPasswordLongEnough(passwordValue)

  useEffect(() => {
    if (!isAuthenticated) return
    const currentProfile = useAuthStore.getState().profile
    if (currentProfile?.password_upgrade_required) {
      navigate('/update-password-required', { replace: true })
      return
    }
    navigate(from ?? ROLE_DASHBOARD.employee, { replace: true })
  }, [isAuthenticated, from, navigate])

  const onSubmit = async (data: FormData) => {
    setError('')
    if (!z.string().email().safeParse(data.email).success) {
      setError(INVALID_LOGIN_MESSAGE)
      return
    }
    try {
      const { dest, passwordUpgradeRequired } = await login(data.email, data.password)
      if (passwordUpgradeRequired) {
        navigate('/update-password-required', { replace: true, state: { from: from ?? dest } })
      } else {
        navigate(from ?? dest, { replace: true })
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : INVALID_LOGIN_MESSAGE
      setError(message === ACCOUNT_LOCKED_MESSAGE ? message : INVALID_LOGIN_MESSAGE)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background to-accent/30 p-4 safe-area-pt safe-area-pb safe-area-px">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <AppLogo className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
          <CardDescription>Security awareness training, incident reporting &amp; compliance</CardDescription>
        </CardHeader>
        <CardContent>
          {!isBackendReady() && (
            <p className="text-sm text-amber-600 dark:text-amber-500 mb-4 text-center">
              {BACKEND_NOT_CONFIGURED_MESSAGE}
            </p>
          )}
          {successMessage && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4 text-center">
              {successMessage}
            </p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="you@hospital.org" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {passwordTooShort && (
                <p className="text-sm text-amber-600 dark:text-amber-500">{PASSWORD_CRITERIA_HINT}</p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {error && passwordTooShort && error === INVALID_LOGIN_MESSAGE && (
              <p className="text-sm text-amber-600 dark:text-amber-500">{LOGIN_SHORT_PASSWORD_HINT}</p>
            )}
            <Button type="submit" className="w-full min-h-12" disabled={isSubmitting || !isBackendReady()}>
              Sign in
            </Button>
          </form>
          <p className="text-center text-sm mt-4">
            <Link to="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
