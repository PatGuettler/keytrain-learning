import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { APP_NAME, ROLE_DASHBOARD } from '@/lib/constants'
import { Link } from 'react-router-dom'
import { isBackendReady } from '@/backend'
import { BACKEND_NOT_CONFIGURED_MESSAGE } from '@/lib/backend-config'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(5),
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

  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (isAuthenticated) navigate(from ?? ROLE_DASHBOARD.employee, { replace: true })
  }, [isAuthenticated, from, navigate])

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const dest = await login(data.email, data.password)
      navigate(from ?? dest, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background to-accent/30 p-4 safe-area-pt safe-area-pb safe-area-px">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
          <CardDescription>Healthcare training & incident reporting</CardDescription>
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
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
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
