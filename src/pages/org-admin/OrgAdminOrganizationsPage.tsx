import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, ChevronRight, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  createOrganizationAsOrgAdmin,
  fetchMyOrgMemberships,
  switchActiveOrganization,
} from '@/services/org-memberships.service'
import { orgAdminCanCreateOrganizations } from '@/services/org-license.service'
import { useAuthStore } from '@/store/authStore'

export function OrgAdminOrganizationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  const userId = useAuthStore((s) => s.userId)
  const email = useAuthStore((s) => s.email)
  const setAuth = useAuthStore((s) => s.setAuth)

  const [showForm, setShowForm] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [error, setError] = useState('')

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['my-org-memberships', userId],
    queryFn: fetchMyOrgMemberships,
    enabled: Boolean(userId),
  })

  const adminOrgs = memberships
    .filter((m) => m.role === 'org_admin')
    .map((m) => ({
      id: m.org_id,
      name: m.organization?.name ?? m.org_id,
      membershipId: m.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const { data: canCreateOrgs = false } = useQuery({
    queryKey: ['org-admin-can-create-orgs', userId],
    queryFn: orgAdminCanCreateOrganizations,
    enabled: Boolean(userId && profile?.role === 'org_admin'),
  })

  const createMutation = useMutation({
    mutationFn: createOrganizationAsOrgAdmin,
    onSuccess: async (org) => {
      const nextProfile = await switchActiveOrganization(org.id)
      if (userId && email) setAuth({ userId, email, profile: nextProfile })
      await queryClient.invalidateQueries()
      setNewOrgName('')
      setShowForm(false)
      setError('')
      navigate(`/org-admin/organizations/${org.id}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Organizations"
        description="Choose an organization to manage its users, or create a new one."
        action={
          canCreateOrgs ? (
            <Button onClick={() => setShowForm((v) => !v)} className="w-full sm:w-auto min-h-11">
              <Plus className="h-4 w-4 mr-1" />
              New Organization
            </Button>
          ) : undefined
        }
      />

      {!canCreateOrgs && adminOrgs.length > 0 && (
        <p className="text-sm text-muted-foreground rounded-lg border bg-muted/30 px-4 py-3">
          Creating additional organizations is a paid add-on. Contact KeyTrain if you need to
          manage more than one organization.
        </p>
      )}

      {showForm && canCreateOrgs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create organization</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                const name = newOrgName.trim()
                if (name) createMutation.mutate(name)
              }}
            >
              <div className="flex-1 space-y-2">
                <Label htmlFor="org-admin-org-name">Organization name</Label>
                <Input
                  id="org-admin-org-name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Acme East Campus"
                  required
                  minLength={2}
                />
              </div>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="sm:self-end min-h-10"
              >
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </form>
            {error ? <p className="text-sm text-destructive mt-2">{error}</p> : null}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading organizations…</p>
      ) : adminOrgs.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="p-6 space-y-3 text-sm text-muted-foreground">
            <p>No organizations on your account yet.</p>
            {canCreateOrgs ? (
              <Button type="button" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create organization
              </Button>
            ) : (
              <p>Contact KeyTrain to enable organization creation for your account.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {adminOrgs.map((org) => {
            const isActive = org.id === profile?.org_id
            return (
              <li key={org.id}>
                <Link
                  to={`/org-admin/organizations/${org.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {org.name}
                        {isActive ? (
                          <Badge variant="secondary" className="ml-2 text-xs align-middle">
                            Active
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-sm text-muted-foreground">Manage users</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
