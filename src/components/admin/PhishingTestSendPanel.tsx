import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FlaskConical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchProfiles } from '@/services/users.service'
import { sendPhishingCampaign } from '@/services/phishing.service'
import { useAuthStore } from '@/store/authStore'

import { isValidEmail, getEmailValidationError } from '@/lib/email-validation'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function PhishingTestSendPanel({
  campaignId,
  disabled,
  onSent,
  onError,
}: {
  campaignId: string
  disabled?: boolean
  onSent: (message: string) => void
  onError: (message: string) => void
}) {
  const [search, setSearch] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const myEmail = useAuthStore((s) => s.email)

  const { data: users = [] } = useQuery({
    queryKey: ['phishing-test-user-picker'],
    queryFn: () => fetchProfiles({ includeInactive: true, excludeAdmins: false }),
  })

  const selectedSet = useMemo(() => new Set(selectedEmails), [selectedEmails])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => u.email)
      .filter((u) => {
        if (!q) return true
        return (
          u.full_name.toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q)
        )
      })
      .slice(0, 12)
  }, [users, search])

  const addEmail = (raw: string) => {
    const email = normalizeEmail(raw)
    if (!email) return
    if (!isValidEmail(email)) {
      onError(getEmailValidationError(email) ?? 'Enter a valid email address.')
      return
    }
    if (selectedSet.has(email)) return
    setSelectedEmails((prev) => [...prev, email])
    setEmailInput('')
    onError('')
  }

  const removeEmail = (email: string) => {
    setSelectedEmails((prev) => prev.filter((e) => e !== email))
  }

  const handleTestSend = async () => {
    if (selectedEmails.length === 0) {
      onError('Add at least one email for a test send.')
      return
    }
    const count = selectedEmails.length
    if (
      !window.confirm(
        `Send a test to ${count} address${count === 1 ? '' : 'es'}? The campaign will stay a draft.`
      )
    ) {
      return
    }
    setSending(true)
    onError('')
    try {
      const result = await sendPhishingCampaign(campaignId, {
        testMode: true,
        testEmails: selectedEmails,
      })
      setSelectedEmails([])
      onSent(result.message)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Test send failed.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-amber-600" />
          Test send
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter an email or pick users from the list below. Test sends only go to the addresses you
          add here — the campaign stays a draft until you send to everyone.
        </p>

        <div className="space-y-2">
          <Label htmlFor="test-email-input">Email address</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="test-email-input"
              type="email"
              placeholder="you@hospital.org"
              value={emailInput}
              disabled={disabled || sending}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addEmail(emailInput)
                }
              }}
              className="min-w-[12rem] flex-1"
            />
            {myEmail && (
              <Button
                type="button"
                variant="outline"
                disabled={disabled || sending || selectedSet.has(normalizeEmail(myEmail))}
                onClick={() => addEmail(myEmail)}
              >
                Add me
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={disabled || sending || !emailInput.trim()}
              onClick={() => addEmail(emailInput)}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-user-search">Or search users</Label>
          <Input
            id="test-user-search"
            placeholder="Search by name or email…"
            value={search}
            disabled={disabled || sending}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="rounded-md border bg-background max-h-44 overflow-y-auto divide-y">
            {filteredUsers.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No matching users.</p>
            ) : (
              filteredUsers.map((user) => {
                const email = user.email!
                const added = selectedSet.has(normalizeEmail(email))
                const isSelf = myEmail && normalizeEmail(email) === normalizeEmail(myEmail)
                return (
                  <button
                    key={user.id}
                    type="button"
                    disabled={disabled || sending || added}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 disabled:opacity-50 disabled:cursor-default"
                    onClick={() => addEmail(email)}
                  >
                    <span className="font-medium">
                      {user.full_name}
                      {isSelf && <span className="text-muted-foreground font-normal"> (you)</span>}
                    </span>
                    <span className="text-muted-foreground"> · {email}</span>
                    {added && <span className="text-muted-foreground ml-1">(added)</span>}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {selectedEmails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedEmails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-sm"
              >
                {email}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${email}`}
                  onClick={() => removeEmail(email)}
                  disabled={disabled || sending}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          disabled={disabled || sending || selectedEmails.length === 0}
          onClick={handleTestSend}
        >
          <FlaskConical className="h-4 w-4 mr-1" />
          {sending ? 'Sending test…' : `Send test (${selectedEmails.length})`}
        </Button>
      </CardContent>
    </Card>
  )
}
