import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddOrgUserForm } from '@/components/admin/AddOrgUserForm'
import { OrgUserImportPanel } from '@/components/admin/OrgUserImportPanel'
import { OrgUsersTable } from '@/components/admin/OrgUsersTable'
import { fetchOrganizationById } from '@/services/organizations.service'
import { fetchOrgMembers } from '@/services/users.service'
import { useAuthStore } from '@/store/authStore'

export function OrgAdminUsersPage() {
  const profile = useAuthStore((s) => s.profile)
  const orgId = profile?.org_id

  const { data: org } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: () => fetchOrganizationById(orgId!),
    enabled: Boolean(orgId),
  })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: () => fetchOrgMembers(orgId!, true),
    enabled: Boolean(orgId),
  })

  const managers = users.filter((u) => u.role === 'manager' || u.role === 'org_admin')

  if (!orgId) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={`Invite and manage people in ${org?.name ?? 'your organization'}. Role changes show a billing confirmation first.`}
      />

      <AddOrgUserForm orgId={orgId} managers={managers} />

      <OrgUserImportPanel orgId={orgId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading users…</p>
          ) : (
            <OrgUsersTable
              orgId={orgId}
              users={users}
              managers={managers}
              railnetOrgId={org?.railnet_org_id ?? null}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
