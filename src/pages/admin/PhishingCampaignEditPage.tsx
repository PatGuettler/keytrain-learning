import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PhishingEmailPreview } from '@/components/admin/PhishingEmailPreview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { fetchHospitalOrganizations } from '@/services/organizations.service'
import {
  createPhishingCampaign,
  fetchHandPickRecipients,
  fetchPhishingCampaign,
  fetchPhishingTemplates,
  getDefaultFakeLoginUrl,
  defaultPhishingSenderEmail,
  syncPhishingRecipients,
  updatePhishingCampaign,
} from '@/services/phishing.service'
import { fetchProfile } from '@/services/auth.service'
import { previewPhishingText } from '@/lib/phishing-preview'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { PHISHING_PRETEXT_LABELS, type PhishingTargetScope } from '@/types/phishing.types'
import type { Profile } from '@/types/user.types'

const RECIPIENTS_PER_PAGE = 8

export function PhishingCampaignEditPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const isNew = !campaignId || campaignId === 'new'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.userId)!
  const authEmail = useAuthStore((s) => s.email)
  const authProfile = useAuthStore((s) => s.profile)

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
  const [senderEmail, setSenderEmail] = useState('noreply@keytrainlearning.com')
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
  const [bodyTab, setBodyTab] = useState<'preview' | 'html' | 'text'>('preview')

  const {
    data: allUsers = [],
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['phishing-hand-pick-users'],
    queryFn: fetchHandPickRecipients,
    enabled: targetScope === 'custom',
  })

  const { data: loadedSelfProfile } = useQuery({
    queryKey: ['phishing-hand-pick-self', userId],
    queryFn: () => fetchProfile(userId),
    enabled: targetScope === 'custom' && Boolean(userId) && !authProfile,
  })

  const selfProfile = useMemo((): Profile | null => {
    const base = authProfile ?? loadedSelfProfile
    if (!userId || !base) return null
    const email = base.email?.trim() || authEmail?.trim() || null
    return { ...base, email }
  }, [authProfile, authEmail, loadedSelfProfile, userId])

  const selectableUsers = useMemo(() => {
    if (!selfProfile) return allUsers
    const existing = allUsers.find((user) => user.id === selfProfile.id)
    if (existing) {
      return allUsers.map((user) =>
        user.id === selfProfile.id
          ? { ...user, email: user.email?.trim() || selfProfile.email }
          : user
      )
    }
    return [selfProfile, ...allUsers]
  }, [allUsers, selfProfile])

  const resolveRecipientEmail = (user: Profile) =>
    user.email?.trim() || (user.id === userId ? authEmail?.trim() : '') || ''

  const canSelectRecipient = (user: Profile) =>
    Boolean(resolveRecipientEmail(user)) || user.role === 'admin'

  const recipientEmailLabel = (user: Profile) => {
    const email = resolveRecipientEmail(user)
    if (email) return email
    if (user.role === 'admin') return 'login email on file'
    return 'no email on file'
  }

  const otherAdmins = useMemo(
    () => selectableUsers.filter((user) => user.role === 'admin' && user.id !== userId),
    [selectableUsers, userId]
  )

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    let others = selectableUsers.filter((user) => user.id !== userId)
    if (!q) {
      others = others.filter((user) => user.role !== 'admin')
    }
    const sorted = [...others].sort((a, b) =>
      a.full_name.localeCompare(b.full_name, undefined, { sensitivity: 'base' })
    )

    if (!q) return sorted

    return sorted.filter(
      (user) =>
        user.full_name.toLowerCase().includes(q) ||
        resolveRecipientEmail(user).toLowerCase().includes(q) ||
        (user.role === 'admin' && 'admin'.includes(q))
    )
  }, [authEmail, selectableUsers, userId, userSearch])

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
    setSenderEmail(defaultPhishingSenderEmail(template.sender_email_local))
    setBodyHtml(template.body_html)
    setBodyText(template.body_text)
    setPretext(template.pretext)
    setBodyTab('preview')
  }

  const toggleUser = (id: string) => {
    const user = selectableUsers.find((entry) => entry.id === id)
    if (!user || !canSelectRecipient(user)) return
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const addSelfAsRecipient = () => {
    if (!userId) return
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]))
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

      if (!isNew && !campaignId) {
        throw new Error('Campaign ID is missing. Open this page from the campaigns list.')
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
        description="Choose a template and audience. Placeholders like {{COMPANY_NAME}}, {{FIRST_NAME}}, and {{SENDER_EMAIL}} are filled in per recipient when emails are sent."
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
            className="hidden sm:block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
          <div className="grid gap-2 sm:hidden">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t.id)}
                className={cn(
                  'rounded-md border px-3 py-3 text-left text-sm transition-colors',
                  templateId === t.id
                    ? 'border-primary bg-primary/5'
                    : 'bg-background hover:bg-accent/50'
                )}
              >
                <span className="font-medium block">{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  {PHISHING_PRETEXT_LABELS[t.pretext] ?? t.pretext}
                  {t.difficulty ? ` · ${t.difficulty}` : ''}
                </span>
              </button>
            ))}
          </div>
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
                <div className="flex flex-wrap items-center gap-2">
                  {selfProfile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedUserIds.includes(userId)}
                      onClick={addSelfAsRecipient}
                    >
                      {selectedUserIds.includes(userId) ? 'You are selected' : 'Add me for testing'}
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {selectedUserIds.length} selected
                  </span>
                </div>
              </div>
              {selfProfile ? (
                <label
                  className={`flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm ${
                    canSelectRecipient(selfProfile)
                      ? 'hover:bg-accent/50 cursor-pointer'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(userId)}
                    disabled={!canSelectRecipient(selfProfile)}
                    onChange={() => toggleUser(userId)}
                  />
                  <span className="font-medium">
                    {selfProfile.full_name}
                    <span className="text-muted-foreground font-normal"> (you)</span>
                  </span>
                  <span className="text-muted-foreground">
                    ({recipientEmailLabel(selfProfile)})
                  </span>
                </label>
              ) : (
                <p className="text-sm text-muted-foreground rounded-md border px-3 py-2">
                  Loading your account…
                </p>
              )}
              {!userSearch.trim() && otherAdmins.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Platform admins
                  </p>
                  <div className="rounded-md border divide-y">
                    {otherAdmins.map((user) => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-2 px-3 py-2 text-sm ${
                          canSelectRecipient(user)
                            ? 'hover:bg-accent/50 cursor-pointer'
                            : 'opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          disabled={!canSelectRecipient(user)}
                          onChange={() => toggleUser(user.id)}
                        />
                        <span className="font-medium">{user.full_name}</span>
                        <span className="text-muted-foreground">
                          ({recipientEmailLabel(user)})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
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
                {usersLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">Loading users…</p>
                ) : usersError ? (
                  <div className="p-3 space-y-2">
                    <p className="text-sm text-destructive">Could not load users.</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => refetchUsers()}>
                      Retry
                    </Button>
                  </div>
                ) : paginatedUsers.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    {userSearch.trim()
                      ? 'No matching users.'
                      : otherAdmins.length > 0
                        ? 'No hospital users yet — use platform admins above for testing.'
                        : selectableUsers.length <= 1
                          ? 'No other users found in the app.'
                          : 'No users on this page.'}
                  </p>
                ) : (
                  paginatedUsers.map((user) => {
                    const selectable = canSelectRecipient(user)
                    return (
                      <label
                        key={user.id}
                        className={`flex items-center gap-2 px-3 py-2 text-sm ${
                          selectable
                            ? 'hover:bg-accent/50 cursor-pointer'
                            : 'opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          disabled={!selectable}
                          onChange={() => toggleUser(user.id)}
                        />
                        <span className="font-medium">
                          {user.full_name}
                          {user.role === 'admin' && (
                            <span className="text-muted-foreground font-normal"> · admin</span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          ({recipientEmailLabel(user)})
                        </span>
                      </label>
                    )
                  })
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
              placeholder="{{COMPANY_SLUG}}-hr-benefits@{{EMAIL_DOMAIN}}"
            />
            <p className="text-xs text-muted-foreground">
              Resolved per recipient, e.g. memorial-hospital-hr-benefits@keytrainlearning.com. Use{' '}
              {'{{COMPANY_NAME}}'}, {'{{COMPANY_SLUG}}'}, {'{{SENDER_EMAIL}}'}, {'{{EMAIL_DOMAIN}}'}.
            </p>
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

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Email body</Label>
            <div className="flex rounded-md border p-0.5 text-xs sm:text-sm">
              {(['preview', 'html', 'text'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setBodyTab(tab)}
                  className={cn(
                    'rounded px-2.5 py-1 capitalize transition-colors',
                    bodyTab === tab
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'text' ? 'Plain text' : tab}
                </button>
              ))}
            </div>
          </div>

          {bodyTab === 'preview' && (
            <PhishingEmailPreview
              subject={previewPhishingText(subject)}
              senderName={previewPhishingText(senderName)}
              senderEmail={previewPhishingText(senderEmail)}
              bodyHtml={bodyHtml}
            />
          )}

          {bodyTab === 'html' && (
            <textarea
              id="body-html"
              aria-label="Email HTML"
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono break-all"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
            />
          )}

          {bodyTab === 'text' && (
            <textarea
              id="body-text"
              aria-label="Plain text fallback"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono break-all"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
            />
          )}
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
