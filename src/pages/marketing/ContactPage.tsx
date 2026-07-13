import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitMarketingContact } from '@/services/marketing-contact.service'

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await submitMarketingContact({
        name,
        email,
        organization,
        message,
        website,
      })
      setSent(true)
      setName('')
      setEmail('')
      setOrganization('')
      setMessage('')
      setWebsite('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.')
    } finally {
      setSending(false)
    }
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
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send a message</CardTitle>
            <CardDescription>
              Submit the form and our team will get back to you by email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-sm">
                <p className="text-emerald-600 dark:text-emerald-400">
                  Thanks — we received your message and will follow up soon.
                </p>
                <Button type="button" variant="outline" onClick={() => setSent(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="relative space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-org">Organization</Label>
                  <Input
                    id="contact-org"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Acme Corporation"
                    autoComplete="organization"
                  />
                </div>
                {/* Honeypot — hidden from users */}
                <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden>
                  <Label htmlFor="contact-website">Website</Label>
                  <Input
                    id="contact-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
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
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? 'Sending…' : 'Send message'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
