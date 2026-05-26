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
import { APP_NAME, DEMO_USERS } from '@/lib/constants'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured } from '@/services/supabase'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (isAuthenticated) navigate(from ?? '/employee/dashboard', { replace: true })
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

  const fillDemo = (key: keyof typeof DEMO_USERS) => {
    const u = DEMO_USERS[key]
    void onSubmit({ email: u.email, password: u.password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
          <CardDescription>Healthcare training & incident reporting</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="you@hospital.org" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Sign in
            </Button>
          </form>
          <p className="text-center text-sm mt-4">
            <Link to="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </p>
          {!isSupabaseConfigured && (
            <div className="mt-6 pt-6 border-t space-y-2">
              <p className="text-xs text-muted-foreground text-center">Demo accounts (no Supabase required)</p>
              <div className="grid grid-cols-1 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('admin')}>
                  Admin — {DEMO_USERS.admin.email}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('manager')}>
                  Manager — {DEMO_USERS.manager.email}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('employee')}>
                  Employee — {DEMO_USERS.employee.email}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
