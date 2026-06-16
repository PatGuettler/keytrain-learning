import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { fetchHospitalOrganizations } from '@/services/organizations.service'
import { fetchProfiles } from '@/services/users.service'
import {
  createPhishingCampaign,
  fetchPhishingCampaign,
  fetchPhishingTemplates,
  getDefaultFakeLoginUrl,
  syncPhishingRecipients,
  updatePhishingCampaign,
} from '@/services/phishing.service'
import { useAuthStore } from '@/store/authStore'
import { PHISHING_PRETEXT_LABELS, type PhishingTargetScope } from '@/types/phishing.types'

const RECIPIENTS_PER_PAGE = 8

export function PhishingCampaignEditPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const isNew = campaignId === 'new'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.userId)!

  const { data: existing } = useQuery({
    queryKey: ['phishing-campaign', campaignId],
    queryFn: () => fetchPhishingCampaign(campaignId!),
    enabled: !isNew && Boolean(campaignId),
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['phishing-templates'],
    queryFn: fetchPhishingTemplates,
  })

  const { data: hospitals = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchHospitalOrganizations,
  })

  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [orgId, setOrgId] = useState('')
  const [targetScope, setTargetScope] = useState<PhishingTargetScope>('org')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('noreply@your-simulation-domain.com')
  const [bodyHtml, setBodyHtml] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [pretext, setPretext] = useState('')
  const [fakeLoginUrl, setFakeLoginUrl] = useState(getDefaultFakeLoginUrl())
  const [deadlineDate, setDeadlineDate] = useState('Friday')
  const [trackOpens, setTrackOpens] = useState(true)
  const [excludeAdmins, setExcludeAdmins] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: allUsers = [] } = useQuery({
    queryKey: ['phishing-campaign-user-picker'],
    queryFn: () => fetchProfiles({ includeInactive: true, excludeAdmins: false }),
    enabled: targetScope === 'custom',
  })

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    const withEmail = allUsers
      .filter((u) => u.email)
      .sort((a, b) =>
        a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' })
      )

    if (!q) return withEmail

    return withEmail.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
    )
  }, [allUsers, userSearch])

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / RECIPIENTS_PER_PAGE))

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * RECIPIENTS_PER_PAGE
    return filteredUsers.slice(start, start + RECIPIENTS_PER_PAGE)
  }, [filteredUsers, userPage])

  useEffect(() => {
    if (userPage > totalUserPages) {
      setUserPage(totalUserPages)
    }
  }, [userPage, totalUserPages])

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setTemplateId(existing.template_id ?? '')
    setOrgId(existing.org_id ?? '')
    setTargetScope(existing.target_scope)
    setSelectedUserIds(existing.target_user_ids ?? [])
    setSubject(existing.subject)
    setSenderName(existing.sender_name)
    setSenderEmail(existing.sender_email)
    setBodyHtml(existing.body_html)
    setBodyText(existing.body_text)
    setPretext(existing.pretext ?? '')
    setFakeLoginUrl(existing.fake_login_url ?? getDefaultFakeLoginUrl())
    setDeadlineDate(existing.deadline_date ?? 'Friday')
    setTrackOpens(existing.track_opens)
    setExcludeAdmins(existing.exclude_admins)
  }, [existing])

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId]
  )

  const applyTemplate = (id: string) => {
    const template = templates.find((t) => t.id === id)
    if (!template) return
    setTemplateId(id)
    setSubject(template.subject)
    setSenderName(template.sender_name)
    setSenderEmail(`${template.sender_email_local}@your-simulation-domain.com`)
    setBodyHtml(template.body_html)
    setBodyText(template.body_text)
    setPretext(template.pretext)
  }

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (!name.trim()) throw new Error('Campaign name is required.')
      if (!subject.trim()) throw new Error('Email subject is required.')
      if (!senderEmail.trim()) throw new Error('Sender email is required.')
      if (!bodyHtml.trim()) throw new Error('Email body is required.')
      if (targetScope === 'org' && !orgId) throw new Error('Select an organization.')
      if (targetScope === 'custom' && selectedUserIds.length === 0) {
        throw new Error('Select at least one recipient.')
      }

      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        sender_name: senderName.trim() || 'IT Support',
        sender_email: senderEmail.trim(),
        body_html: bodyHtml,
        body_text: bodyText,
        pretext: pretext || selectedTemplate?.pretext || null,
        fake_login_url: fakeLoginUrl.trim() || getDefaultFakeLoginUrl(),
        track_opens: trackOpens,
        org_id: targetScope === 'org' ? orgId || null : null,
        template_id: templateId || null,
        target_scope: targetScope,
        target_user_ids: targetScope === 'custom' ? selectedUserIds : [],
        exclude_admins: excludeAdmins,
        deadline_date: deadlineDate.trim() || null,
      }

      const campaign = isNew
        ? await createPhishingCampaign(payload, userId)
        : await updatePhishingCampaign(campaignId!, payload)

      await syncPhishingRecipients(campaign)
      await queryClient.invalidateQueries({ queryKey: ['phishing-campaigns'] })
      await queryClient.invalidateQueries({ queryKey: ['phishing-campaign', campaign.id] })
      navigate(`/admin/phishing/campaigns/${campaign.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save campaign.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/phishing/campaigns">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Campaigns
        </Link>
      </Button>

      <PageHeader
        title={isNew ? 'New phishing campaign' : 'Edit campaign'}
        description="Choose a template, audience, and fake login URL. Saving creates per-recipient tracking tokens."
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaign-name">Campaign name</Label>
          <Input id="campaign-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template">Template</Label>
          <select
            id="template"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
          >
            <option value="">Select a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({PHISHING_PRETEXT_LABELS[t.pretext] ?? t.pretext})
              </option>
            ))}
          </select>
        </div>

        <div className={targetScope === 'org' ? 'grid gap-4 sm:grid-cols-2' : 'space-y-4'}>
          <div className="space-y-2">
            <Label htmlFor="target-scope">Audience</Label>
            <select
              id="target-scope"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={targetScope}
              onChange={(e) => {
                const scope = e.target.value as PhishingTargetScope
                setTargetScope(scope)
                setUserSearch('')
                setUserPage(1)
                if (scope === 'all') {
                  setOrgId('')
                  setSelectedUserIds([])
                } else if (scope === 'org') {
                  setSelectedUserIds([])
                } else {
                  setOrgId('')
                }
              }}
            >
              <option value="all">All hospital staff</option>
              <option value="org">One organization</option>
              <option value="custom">Hand-picked users</option>
            </select>
          </div>
          {targetScope === 'org' && (
            <div className="space-y-2">
              <Label htmlFor="org">Organization</Label>
              <select
                id="org"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                <option value="">Select…</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {targetScope === 'custom' && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="recipient-search">Recipients</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedUserIds.length} selected
                </span>
              </div>
              <Input
                id="recipient-search"
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value)
                  setUserPage(1)
                }}
              />
              <div className="rounded-md border divide-y min-h-[12rem]">
                {paginatedUsers.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    {userSearch.trim() ? 'No matching users.' : 'No users with email addresses found.'}
                  </p>
                ) : (
                  paginatedUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUser(user.id)}
                      />
                      <span className="font-medium">{user.full_name}</span>
                      <span className="text-muted-foreground">({user.email})</span>
                    </label>
                  ))
                )}
              </div>
              {filteredUsers.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Page {userPage} of {totalUserPages}
                    <span className="hidden sm:inline">
                      {' '}
                      · {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={userPage >= totalUserPages}
                      onClick={() => setUserPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {targetScope !== 'custom' && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={excludeAdmins}
              onChange={(e) => setExcludeAdmins(e.target.checked)}
            />
            Exclude platform admins from audience
          </label>
        )}

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sender-name">Sender name</Label>
            <Input id="sender-name" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sender-email">Sender email</Label>
            <Input
              id="sender-email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="noreply@your-domain.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fake-login-url">Fake login page URL</Label>
          <Input
            id="fake-login-url"
            value={fakeLoginUrl}
            onChange={(e) => setFakeLoginUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Default uses the bundled <code>/phishing-sim/login.html</code> page until you deploy a
            Cloudflare Pages site on your own domain.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline text (optional)</Label>
          <Input id="deadline" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={trackOpens} onChange={(e) => setTrackOpens(e.target.checked)} />
          Include open-tracking pixel (unreliable in many email clients)
        </label>

        <div className="space-y-2">
          <Label htmlFor="body-html">Email HTML</Label>
          <textarea
            id="body-html"
            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body-text">Plain text fallback</Label>
          <textarea
            id="body-text"
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save & build recipients'}
        </Button>
        {error && <p className="text-sm text-destructive w-full">{error}</p>}
      </div>
    </div>
  )
}
