import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, ChevronRight, Plus } from 'lucide-react'
import { getOrgSlug } from '@/lib/org-slugs'
import { fetchHospitalOrganizations, createOrganization } from '@/services/organizations.service'
import { fetchProfiles } from '@/services/users.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OrganizationsPage() {
  const queryClient = useQueryClient()
  const [newOrgName, setNewOrgName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchHospitalOrganizations,
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-org-users'],
    queryFn: () => fetchProfiles({ includeInactive: true }),
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => createOrganization(name),
    onSuccess: () => {
      setNewOrgName('')
      setShowForm(false)
      setError('')
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (e: Error) => setError(e.message),
  })

  const userCountByOrg = allUsers.reduce<Record<string, number>>((acc, u) => {
    if (u.role === 'admin') return acc
    acc[u.org_id] = (acc[u.org_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Organizations"
        action={
          <Button onClick={() => setShowForm((v) => !v)} className="w-full sm:w-auto min-h-11">
            <Plus className="h-4 w-4 mr-1" />
            New Organization
          </Button>
        }
      />

      {showForm && (
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
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Acme Community Services"
                  required
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="sm:self-end min-h-10">
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </form>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading organizations…</p>
      ) : orgs.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No organizations yet. Create an organization to add users and courses.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                to={`/admin/organizations/${getOrgSlug(org, orgs)}`}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{org.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {userCountByOrg[org.id] ?? 0} user{(userCountByOrg[org.id] ?? 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
