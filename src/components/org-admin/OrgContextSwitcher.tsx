import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  createOrganizationAsOrgAdmin,
  fetchMyOrgMemberships,
  switchActiveOrganization,
} from '@/services/org-memberships.service'
import { orgAdminCanCreateOrganizations } from '@/services/org-license.service'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

export function OrgContextSwitcher({ className }: { className?: string }) {
  const profile = useAuthStore((s) => s.profile)
  const setAuth = useAuthStore((s) => s.setAuth)
  const userId = useAuthStore((s) => s.userId)
  const email = useAuthStore((s) => s.email)
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['my-org-memberships', userId],
    queryFn: fetchMyOrgMemberships,
    enabled: Boolean(userId && profile?.role === 'org_admin'),
  })

  const { data: canCreateOrgs = false } = useQuery({
    queryKey: ['org-admin-can-create-orgs', userId],
    queryFn: orgAdminCanCreateOrganizations,
    enabled: Boolean(userId && profile?.role === 'org_admin'),
  })

  const adminMemberships = memberships.filter((m) => m.role === 'org_admin')

  const switchMutation = useMutation({
    mutationFn: switchActiveOrganization,
    onSuccess: async (nextProfile) => {
      if (!userId || !email) return
      setAuth({ userId, email, profile: nextProfile })
      await queryClient.invalidateQueries()
      setError('')
    },
    onError: (e: Error) => setError(e.message),
  })

  const createMutation = useMutation({
    mutationFn: createOrganizationAsOrgAdmin,
    onSuccess: async (org) => {
      const nextProfile = await switchActiveOrganization(org.id)
      if (userId && email) setAuth({ userId, email, profile: nextProfile })
      await queryClient.invalidateQueries()
      setNewName('')
      setCreateOpen(false)
      setError('')
    },
    onError: (e: Error) => setError(e.message),
  })

  if (!profile || profile.role !== 'org_admin') return null

  const activeName =
    adminMemberships.find((m) => m.org_id === profile.org_id)?.organization?.name ??
    'Organization'

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 max-w-[16rem] justify-between gap-2"
            disabled={isLoading || switchMutation.isPending}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{activeName}</span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Switch organization
          </DropdownMenuLabel>
          {adminMemberships.length === 0 ? (
            <DropdownMenuItem disabled>No organizations yet</DropdownMenuItem>
          ) : (
            adminMemberships.map((m) => (
              <DropdownMenuItem
                key={m.id}
                disabled={m.org_id === profile.org_id || switchMutation.isPending}
                onSelect={() => switchMutation.mutate(m.org_id)}
              >
                <span className="truncate">
                  {m.organization?.name ?? m.org_id}
                  {m.org_id === profile.org_id ? ' (active)' : ''}
                </span>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          {canCreateOrgs ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setCreateOpen((v) => !v)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create organization
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>Create organization (contact KeyTrain)</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {createOpen && canCreateOrgs ? (
        <form
          className="mt-1 space-y-2 rounded-md border bg-card p-3 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newName.trim()) return
            createMutation.mutate(newName.trim())
          }}
        >
          <Label htmlFor="new-org-name" className="text-xs">
            New organization name
          </Label>
          <Input
            id="new-org-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Acme East Campus"
            required
            minLength={2}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreateOpen(false)
                setNewName('')
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
