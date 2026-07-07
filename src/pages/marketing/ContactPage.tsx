import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SUPPORT_INBOX_EMAIL } from '@/lib/support-email'

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(
      organization.trim()
        ? `KTL inquiry — ${organization.trim()}`
        : 'KeyTrain Learning inquiry'
    )
    const body = encodeURIComponent(
      [
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
        organization.trim() ? `Organization: ${organization.trim()}` : '',
        '',
        message.trim(),
      ]
        .filter(Boolean)
        .join('\n')
    )
    window.location.href = `mailto:${SUPPORT_INBOX_EMAIL}?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Contact us</h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Interested in KeyTrain Learning for your organization? Tell us about your team and we&apos;ll
            follow up with onboarding options, pricing, and a demo.
          </p>
          <div className="mt-8 space-y-4 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Existing users:</span>{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>{' '}
              and use the contact form on your profile for faster support (we already know your org).
            </p>
            <p>
              <span className="font-medium text-foreground">Email:</span>{' '}
              <a href={`mailto:${SUPPORT_INBOX_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_INBOX_EMAIL}
              </a>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send a message</CardTitle>
            <CardDescription>
              We&apos;ll open your email client with your message pre-filled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-sm">
                <p className="text-emerald-600 dark:text-emerald-400">
                  If your email app opened, finish sending from there. Otherwise copy your message to{' '}
                  <a href={`mailto:${SUPPORT_INBOX_EMAIL}`} className="text-primary hover:underline">
                    {SUPPORT_INBOX_EMAIL}
                  </a>
                  .
                </p>
                <Button type="button" variant="outline" onClick={() => setSent(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Work email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@hospital.org"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-org">Organization</Label>
                  <Input
                    id="contact-org"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Memorial Hospital"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-message">How can we help?</Label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Open email to send
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
