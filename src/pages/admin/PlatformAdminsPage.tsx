import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DeletePlatformAdminDialog } from '@/components/admin/DeletePlatformAdminDialog'
import { getProfileStatusBadge } from '@/lib/user-status'
import { SendPasswordResetButton } from '@/components/admin/SendPasswordResetButton'
import { APP_NAME } from '@/lib/constants'
import { fetchProfiles } from '@/services/users.service'
import { invitePlatformAdmin } from '@/services/user-management.service'
import { PLATFORM_ORG_ID } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'
import type { Profile } from '@/types/user.types'

export function PlatformAdminsPage() {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((s) => s.userId)!
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [sendInvite, setSendInvite] = useState(true)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [deleteAdmin, setDeleteAdmin] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: () => fetchProfiles({ role: 'admin', includeInactive: true }),
  })

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return admins
    return admins.filter((a) =>
      [a.full_name, a.email ?? ''].some((field) => field.toLowerCase().includes(q))
    )
  }, [admins, search])

  const createMutation = useMutation({
    mutationFn: () =>
      invitePlatformAdmin({
        email: email.trim(),
        full_name: fullName.trim() || undefined,
        send_invites: sendInvite,
      }),
    onSuccess: (result) => {
      setFormError('')
      setFormSuccess(result.message ?? `Admin ${result.status}.`)
      setEmail('')
      setFullName('')
      void queryClient.invalidateQueries({ queryKey: ['platform-admins'] })
    },
    onError: (e: Error) => {
      setFormSuccess('')
      setFormError(e.message)
    },
  })

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Platform Admins"
        description={`Create and manage ${APP_NAME} administrators. Organization staff are managed under Organizations.`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Create admin account
          </CardTitle>
          <CardDescription>
            New accounts are always platform admins with full access to all organizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              setFormError('')
              setFormSuccess('')
              createMutation.mutate()
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourcompany.com"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="admin-name">Full name (optional)</Label>
              <Input
                id="admin-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Derived from email if empty"
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                className="rounded border-input"
              />
              Send invite email
            </label>
            {formError && <p className="text-sm text-destructive sm:col-span-2">{formError}</p>}
            {formSuccess && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 sm:col-span-2">{formSuccess}</p>
            )}
            <Button type="submit" disabled={createMutation.isPending} className="sm:col-span-2 w-full sm:w-auto">
              {createMutation.isPending ? 'Creating…' : 'Create admin account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Current admins
        </h2>
        {!isLoading && admins.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="pl-9"
              aria-label="Search admins"
            />
          </div>
        )}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No platform admins yet.</p>
        ) : filteredAdmins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admins match “{search.trim()}”.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="p-3 pr-4">Name</th>
                  <th className="p-3 pr-4">Email</th>
                  <th className="p-3 pr-4">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="border-b last:border-0">
                    <td className="p-3 pr-4 font-medium">{admin.full_name}</td>
                    <td className="p-3 pr-4 text-muted-foreground">{admin.email ?? '—'}</td>
                    <td className="p-3 pr-4">
                      {(() => {
                        const status = getProfileStatusBadge(admin)
                        return <Badge variant={status.variant}>{status.label}</Badge>
                      })()}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <SendPasswordResetButton
                          orgId={PLATFORM_ORG_ID}
                          userId={admin.id}
                          disabled={!admin.email}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/40"
                          disabled={admin.id === currentUserId}
                          onClick={() => setDeleteAdmin(admin)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DeletePlatformAdminDialog
        open={Boolean(deleteAdmin)}
        onOpenChange={(open) => {
          if (!open) setDeleteAdmin(null)
        }}
        admin={deleteAdmin}
        currentUserId={currentUserId}
        onDeleted={() => {
          void queryClient.invalidateQueries({ queryKey: ['platform-admins'] })
        }}
      />
    </div>
  )
}
