import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteOrgUserDialog } from '@/components/admin/DeleteOrgUserDialog'
import { EditOrgUserDialog } from '@/components/admin/EditOrgUserDialog'
import { UserTrainingPanel } from '@/components/admin/UserTrainingPanel'
import { getProfileStatusBadge } from '@/lib/user-status'
import { adminOrgDashboardPath, getOrgSlug } from '@/lib/org-slugs'
import type { UserAdminTab } from '@/lib/user-admin-paths'
import { orgAdminManagedOrgIds } from '@/lib/org-admin-access'
import { adminUserPath, orgAdminUserPath } from '@/lib/user-admin-paths'
import { fetchProfile } from '@/services/auth.service'
import { fetchOrganizationById, fetchHospitalOrganizations } from '@/services/organizations.service'
import { fetchMyOrgMemberships } from '@/services/org-memberships.service'
import { fetchOrgBillingTerms, isKtlAdmin } from '@/services/org-license.service'
import { fetchOrgMembers } from '@/services/users.service'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

type Scope = 'admin' | 'org_admin'

function tabClass(active: boolean) {
  return cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-11',
    active
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
  )
}

export function UserAdminPage({ scope }: { scope: Scope }) {
  const { userId } = useParams<{ userId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const actor = useAuthStore((s) => s.profile)

  const tab: UserAdminTab = searchParams.get('tab') === 'training' ? 'training' : 'profile'
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
    retry: false,
  })

  const { data: memberships = [] } = useQuery({
    queryKey: ['my-org-memberships', actor?.id],
    queryFn: fetchMyOrgMemberships,
    enabled: scope === 'org_admin' && Boolean(actor?.id),
  })

  const adminOrgIds = useMemo(
    () => orgAdminManagedOrgIds(actor, memberships),
    [actor, memberships]
  )

  const canAccess = useMemo(() => {
    if (!user) return false
    if (user.role === 'admin') return scope === 'admin'
    if (scope === 'admin') return isKtlAdmin(actor)
    return adminOrgIds.includes(user.org_id)
  }, [user, scope, actor, adminOrgIds])

  const orgId = user?.org_id ?? ''

  const { data: hospitals = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchHospitalOrganizations,
    enabled: scope === 'admin',
  })

  const { data: org } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => fetchOrganizationById(orgId),
    enabled: Boolean(orgId),
  })

  const { data: orgUsers = [] } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: () => fetchOrgMembers(orgId, true),
    enabled: Boolean(orgId) && canAccess,
  })

  const managers = useMemo(
    () => orgUsers.filter((u) => u.role === 'manager' || u.role === 'org_admin'),
    [orgUsers]
  )

  const { data: billingTerms = null } = useQuery({
    queryKey: ['org-billing-terms', orgId],
    queryFn: () => fetchOrgBillingTerms(orgId),
    enabled: Boolean(orgId) && canAccess,
  })

  const refresh = (movedToOrgId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    void queryClient.invalidateQueries({ queryKey: ['org-users', orgId] })
    if (movedToOrgId) {
      void queryClient.invalidateQueries({ queryKey: ['org-users', movedToOrgId] })
      if (scope === 'org_admin') {
        navigate(orgAdminUserPath(userId!, 'profile'))
      } else {
        navigate(adminUserPath(userId!, 'profile'))
      }
    }
  }

  const backPath =
    scope === 'admin'
      ? '/admin/dashboard/users'
      : `/org-admin/organizations/${user?.org_id ?? actor?.org_id ?? adminOrgIds[0] ?? ''}`

  const userPath = (t: UserAdminTab) =>
    scope === 'admin' ? adminUserPath(userId!, t) : orgAdminUserPath(userId!, t)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading user…</p>
  }

  if (error || !user) {
    return <p className="text-sm text-muted-foreground">User not found.</p>
  }

  if (!canAccess) {
    return <p className="text-sm text-muted-foreground">You do not have access to manage this user.</p>
  }

  if (user.role === 'admin' && scope === 'org_admin') {
    return <p className="text-sm text-muted-foreground">Platform admins are managed separately.</p>
  }

  const status = getProfileStatusBadge(user)
  const allowOrgAdminRole = isKtlAdmin(actor)

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={backPath}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Link>
      </Button>

      {actionMessage && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{actionMessage}</p>
      )}

      <PageHeader
        title={user.full_name}
        description={[org?.name, user.email].filter(Boolean).join(' · ')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            {user.role !== 'admin' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Link to={userPath('profile')} className={tabClass(tab === 'profile')}>
          Profile
        </Link>
        <Link to={userPath('training')} className={tabClass(tab === 'training')}>
          Training
        </Link>
      </div>

      {tab === 'profile' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">
                {user.role.replace('_', ' ')}
              </Badge>
              <Badge variant={status.variant}>{status.label}</Badge>
              {user.railnet_enabled ? (
                <Badge variant="default">RailNet on</Badge>
              ) : (
                <Badge variant="outline">RailNet off</Badge>
              )}
            </div>
            <p>
              <span className="text-muted-foreground">Email:</span> {user.email ?? '—'}
            </p>
            {user.role === 'employee' && (
              <p>
                <span className="text-muted-foreground">Manager:</span>{' '}
                {managers.find((m) => m.id === user.manager_id)?.full_name ?? '—'}
              </p>
            )}
            <p className="text-muted-foreground">
              Use Edit to change role, organization, RailNet access, or account status.
            </p>
          </CardContent>
        </Card>
      ) : (
        <UserTrainingPanel
          user={user}
          getCourseDetailPath={
            scope === 'admin' && org
              ? (courseId) =>
                  adminOrgDashboardPath(
                    getOrgSlug(org, hospitals),
                    'staff',
                    userId!,
                    'courses',
                    courseId
                  )
              : undefined
          }
        />
      )}

      <EditOrgUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        orgId={orgId}
        user={user}
        managers={managers}
        orgUsers={orgUsers}
        billingTerms={billingTerms}
        allowOrgAdminRole={allowOrgAdminRole}
        railnetOrgId={org?.railnet_org_id ?? null}
        onSaved={(result) => {
          refresh(result?.movedToOrgId)
          setActionMessage(
            result?.movedToOrgId
              ? `${user.full_name} was moved to another organization.`
              : 'User updated.'
          )
        }}
      />

      <DeleteOrgUserDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        orgId={orgId}
        user={user}
        onDeleted={() => {
          void queryClient.invalidateQueries({ queryKey: ['org-users', orgId] })
          navigate(backPath)
        }}
      />
    </div>
  )
}
