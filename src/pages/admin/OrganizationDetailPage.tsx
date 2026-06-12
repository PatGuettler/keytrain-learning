import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { updateOrganization } from '@/services/organizations.service'
import { fetchOrgMembers } from '@/services/users.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AddOrgUserForm } from '@/components/admin/AddOrgUserForm'
import { OrgUserImportPanel } from '@/components/admin/OrgUserImportPanel'
import { OrgUsersTable } from '@/components/admin/OrgUsersTable'
import { DeleteHospitalCard } from '@/components/admin/DeleteHospitalCard'
import { useOrgRoute } from '@/hooks/useOrgRoute'
import { adminOrganizationPath, getOrgSlug } from '@/lib/org-slugs'
import { PLATFORM_ORG_ID } from '@/lib/constants'

export function OrganizationDetailPage() {
  const navigate = useNavigate()
  const { org, orgId, orgs, isLoading: orgsLoading } = useOrgRoute()
  const queryClient = useQueryClient()
  const [orgName, setOrgName] = useState('')
  const [renameError, setRenameError] = useState('')
  const [renameSuccess, setRenameSuccess] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: () => fetchOrgMembers(orgId!, true),
    enabled: Boolean(orgId),
  })

  const managers = users.filter((u) => u.role === 'manager')

  useEffect(() => {
    if (org) setOrgName(org.name)
  }, [org?.name, org])

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateOrganization(orgId!, { name }),
    onSuccess: (updated) => {
      setRenameError('')
      setRenameSuccess('Organization name saved.')
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
      const nextOrgs = orgs.map((o) => (o.id === updated.id ? updated : o))
      navigate(adminOrganizationPath(getOrgSlug(updated, nextOrgs)), { replace: true })
    },
    onError: (e: Error) => {
      setRenameSuccess('')
      setRenameError(e.message)
    },
  })

  const nameChanged = org && orgName.trim() !== org.name

  if (!orgsLoading && !org) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/organizations">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Organizations
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Organization not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/organizations">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Organizations
          </Link>
        </Button>
      </div>

      <PageHeader
        title={org?.name ?? 'Organization'}
        description="Manage hospital staff, roles, and invites"
      />

      {orgId && org && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization name</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                const trimmed = orgName.trim()
                if (!trimmed || !nameChanged) return
                renameMutation.mutate(trimmed)
              }}
            >
              <div className="flex-1 space-y-2">
                <Label htmlFor="org-rename">Hospital name</Label>
                <Input
                  id="org-rename"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value)
                    setRenameSuccess('')
                    setRenameError('')
                  }}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={!nameChanged || renameMutation.isPending}
                className="sm:self-end min-h-10"
              >
                {renameMutation.isPending ? 'Saving…' : 'Save name'}
              </Button>
            </form>
            {renameError && <p className="text-sm text-destructive mt-2">{renameError}</p>}
            {renameSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">{renameSuccess}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {orgId && <AddOrgUserForm orgId={orgId} managers={managers} />}
        {orgId && <OrgUserImportPanel orgId={orgId} />}
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Users</h3>
        {(isLoading || orgsLoading) ? (
          <p className="text-sm text-muted-foreground">Loading users…</p>
        ) : orgId ? (
          <OrgUsersTable orgId={orgId} users={users} managers={managers} />
        ) : null}
      </section>

      {orgId && org && org.id !== PLATFORM_ORG_ID && (
        <DeleteHospitalCard orgId={org.id} hospitalName={org.name} />
      )}
    </div>
  )
}
