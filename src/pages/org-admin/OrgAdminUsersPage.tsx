import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AddOrgUserForm } from '@/components/admin/AddOrgUserForm'
import { OrgUserImportPanel } from '@/components/admin/OrgUserImportPanel'
import { OrgUsersTable } from '@/components/admin/OrgUsersTable'
import { orgAdminUserPath } from '@/lib/user-admin-paths'
import { OrgJoinCodeCard } from '@/components/admin/OrgJoinCodeCard'
import { fetchOrganizationById } from '@/services/organizations.service'
import { fetchOrgMembers } from '@/services/users.service'
import {
  fetchMyOrgMemberships,
  switchActiveOrganization,
} from '@/services/org-memberships.service'
import { orgAdminManagesOrg } from '@/lib/org-admin-access'
import { useAuthStore } from '@/store/authStore'

export function OrgAdminUsersPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const queryClient = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  const userId = useAuthStore((s) => s.userId)
  const email = useAuthStore((s) => s.email)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [switchError, setSwitchError] = useState('')
  const [ready, setReady] = useState(false)

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['my-org-memberships', userId],
    queryFn: fetchMyOrgMemberships,
    enabled: Boolean(userId),
  })

  const canManage = Boolean(orgId && orgAdminManagesOrg(orgId, profile, memberships))

  // Ensure this org is active so manage-users / RLS match the UI context
  useEffect(() => {
    let cancelled = false
    async function ensureActive() {
      setReady(false)
      setSwitchError('')
      if (!orgId || !userId || !email || membershipsLoading) return
      if (!canManage) {
        setSwitchError('You do not administer this organization.')
        return
      }
      try {
        if (profile?.org_id !== orgId) {
          const next = await switchActiveOrganization(orgId)
          if (cancelled) return
          setAuth({ userId, email, profile: next })
          await queryClient.invalidateQueries()
        }
        if (!cancelled) setReady(true)
      } catch (e) {
        if (!cancelled) {
          setSwitchError(e instanceof Error ? e.message : 'Could not switch organization.')
        }
      }
    }
    void ensureActive()
    return () => {
      cancelled = true
    }
  }, [
    orgId,
    canManage,
    membershipsLoading,
    profile?.org_id,
    userId,
    email,
    setAuth,
    queryClient,
  ])

  const activeOrgId = ready ? orgId : undefined

  const { data: org } = useQuery({
    queryKey: ['organization', activeOrgId],
    queryFn: () => fetchOrganizationById(activeOrgId!),
    enabled: Boolean(activeOrgId),
  })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['org-users', activeOrgId],
    queryFn: () => fetchOrgMembers(activeOrgId!, true),
    enabled: Boolean(activeOrgId),
  })

  const managers = users.filter((u) => u.role === 'manager' || u.role === 'org_admin')

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link to="/org-admin/organizations">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to organizations
        </Link>
      </Button>

      <PageHeader
        title={org?.name ?? 'Organization users'}
        description="Invite and manage people in this organization. Role changes show a billing confirmation first."
      />

      {switchError ? <p className="text-sm text-destructive">{switchError}</p> : null}

      {!ready && !switchError && membershipsLoading ? (
        <p className="text-sm text-muted-foreground">Loading organizations…</p>
      ) : null}

      {!ready && !switchError && !membershipsLoading ? (
        <p className="text-sm text-muted-foreground">Opening organization…</p>
      ) : null}

      {ready && activeOrgId ? (
        <>
          {org ? <OrgJoinCodeCard org={org} memberCount={users.length} /> : null}

          <AddOrgUserForm orgId={activeOrgId} managers={managers} />

          <OrgUserImportPanel orgId={activeOrgId} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Directory</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading users…</p>
              ) : (
                <OrgUsersTable
                  orgId={activeOrgId}
                  users={users}
                  managers={managers}
                  railnetOrgId={org?.railnet_org_id ?? null}
                  getUserDetailPath={orgAdminUserPath}
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
