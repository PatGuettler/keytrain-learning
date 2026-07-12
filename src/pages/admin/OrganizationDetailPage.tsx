import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { updateOrganization } from '@/services/organizations.service'
import { fetchOrgTagIds, setOrgTags } from '@/services/training-tags.service'
import { fetchOrgMembers } from '@/services/users.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { TagMultiSelect } from '@/components/admin/TagMultiSelect'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AddOrgUserForm } from '@/components/admin/AddOrgUserForm'
import { OrgUserImportPanel } from '@/components/admin/OrgUserImportPanel'
import { OrgUsersTable } from '@/components/admin/OrgUsersTable'
import { OrgJoinCodeCard } from '@/components/admin/OrgJoinCodeCard'
import { RailNetOrgSetupCard } from '@/components/admin/RailNetOrgSetupCard'
import { OrgBillingPanel } from '@/components/billing/OrgBillingPanel'
import { DeleteHospitalCard } from '@/components/admin/DeleteHospitalCard'
import { useOrgRoute } from '@/hooks/useOrgRoute'
import { adminOrganizationPath, getOrgSlug } from '@/lib/org-slugs'
import { PLATFORM_ORG_ID } from '@/lib/constants'

function tagIdsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((id, i) => id === sortedB[i])
}

export function OrganizationDetailPage() {
  const navigate = useNavigate()
  const { org, orgId, orgs, isLoading: orgsLoading } = useOrgRoute()
  const queryClient = useQueryClient()
  const [orgName, setOrgName] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [savedTagIds, setSavedTagIds] = useState<string[]>([])
  const [renameError, setRenameError] = useState('')
  const [renameSuccess, setRenameSuccess] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: () => fetchOrgMembers(orgId!, true),
    enabled: Boolean(orgId),
  })

  const { data: orgTagIds = [] } = useQuery({
    queryKey: ['org-tags', orgId],
    queryFn: () => fetchOrgTagIds(orgId!),
    enabled: Boolean(orgId),
  })

  const managers = users.filter((u) => u.role === 'manager' || u.role === 'org_admin')

  useEffect(() => {
    if (org) {
      setOrgName(org.name)
    }
  }, [org?.name, org])

  useEffect(() => {
    setSelectedTagIds(orgTagIds)
    setSavedTagIds(orgTagIds)
  }, [orgTagIds])

  const settingsMutation = useMutation({
    mutationFn: async (payload: { name: string; tagIds: string[] }) => {
      const updated = await updateOrganization(orgId!, { name: payload.name })
      await setOrgTags(orgId!, payload.tagIds)
      return updated
    },
    onSuccess: (updated) => {
      setRenameError('')
      setRenameSuccess('Organization settings saved.')
      setSavedTagIds(selectedTagIds)
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
      void queryClient.invalidateQueries({ queryKey: ['org-tags', orgId] })
      const nextOrgs = orgs.map((o) => (o.id === updated.id ? updated : o))
      navigate(adminOrganizationPath(getOrgSlug(updated, nextOrgs)), { replace: true })
    },
    onError: (e: Error) => {
      setRenameSuccess('')
      setRenameError(e.message)
    },
  })

  const settingsChanged =
    org && (orgName.trim() !== org.name || !tagIdsEqual(selectedTagIds, savedTagIds))

  const configuredRailNetOrgId = org?.railnet_org_id?.trim() || null
  const usersWithRailnet = users.filter((u) => u.railnet_enabled === true).length

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
        description="Manage organization staff, RailNet access, and invites"
      />

      {orgId && org && org.id !== PLATFORM_ORG_ID && (
        <>
          <RailNetOrgSetupCard
            orgId={orgId}
            initialRailNetOrgId={org.railnet_org_id ?? ''}
            usersWithRailnet={usersWithRailnet}
            totalUsers={users.length}
          />
          <OrgJoinCodeCard org={org} memberCount={users.length} />
        </>
      )}

      {orgId && org && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                const trimmed = orgName.trim()
                if (!trimmed || !settingsChanged) return
                settingsMutation.mutate({
                  name: trimmed,
                  tagIds: selectedTagIds,
                })
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="org-rename">Organization name</Label>
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
              <TagMultiSelect
                id="org-tags"
                label="Industry tags"
                description="Select tags that match this organization's industry. Used to find relevant courses."
                selectedTagIds={selectedTagIds}
                onChange={(ids) => {
                  setSelectedTagIds(ids)
                  setRenameSuccess('')
                  setRenameError('')
                }}
              />
              <Button type="submit" disabled={!settingsChanged || settingsMutation.isPending}>
                {settingsMutation.isPending ? 'Saving…' : 'Save settings'}
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

      <section id="org-users" className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Users</h3>
          {org?.id !== PLATFORM_ORG_ID && (
            <p className="text-sm text-muted-foreground">
              Edit a user to turn on RailNet access (step 2). Role changes require billing
              confirmation.
            </p>
          )}
        </div>
        {(isLoading || orgsLoading) ? (
          <p className="text-sm text-muted-foreground">Loading users…</p>
        ) : orgId ? (
          <OrgUsersTable
            orgId={orgId}
            users={users}
            managers={managers}
            railnetOrgId={configuredRailNetOrgId}
          />
        ) : null}
      </section>

      {orgId && org && org.id !== PLATFORM_ORG_ID && (
        <section id="org-billing" className="space-y-3">
          <OrgBillingPanel orgId={orgId} orgName={org.name} />
        </section>
      )}

      {orgId && org && org.id !== PLATFORM_ORG_ID && (
        <DeleteHospitalCard orgId={org.id} hospitalName={org.name} />
      )}
    </div>
  )
}
