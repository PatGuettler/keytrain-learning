import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SendPasswordResetButton } from '@/components/admin/SendPasswordResetButton'
import { fetchProfiles } from '@/services/users.service'
import { fetchHospitalOrganizations } from '@/services/organizations.service'
import { APP_SLUG } from '@/lib/constants'
import { adminOrganizationPath, buildOrgSlugLookup } from '@/lib/org-slugs'
import { countProfileStatuses, getProfileStatusBadge, getProfileStatusCategory } from '@/lib/user-status'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types/user.types'

type UserFilter = 'all' | 'active' | 'invited' | 'inactive' | 'locked'
type SortKey = 'name' | 'email' | 'organization' | 'role' | 'status' | 'lastLogin'
type SortDir = 'asc' | 'desc'

const USER_FILTERS: { key: UserFilter; label: string }[] = [
  { key: 'all', label: 'All users' },
  { key: 'active', label: 'Active' },
  { key: 'invited', label: 'Invited' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'locked', label: 'Login locked' },
]

function exportUsersCsv(users: EnrichedUser[]) {
  const headers = [
    'Name',
    'Email',
    'Organization',
    'Role',
    'Status',
    'Last login',
    'User ID',
    'Created',
  ]
  const rows = users.map((u) => [
    u.full_name,
    u.email ?? '',
    u.orgName,
    u.role,
    getProfileStatusBadge(u).label,
    u.last_login_at ? new Date(u.last_login_at).toISOString() : '',
    u.id,
    u.created_at,
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${APP_SLUG}-users-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface EnrichedUser extends Profile {
  orgName: string
}

export function PlatformUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sortKey, setSortKey] = useState<SortKey>('lastLogin')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const paramFilter = searchParams.get('filter')
  const filter: UserFilter =
    paramFilter === 'active' ||
    paramFilter === 'invited' ||
    paramFilter === 'inactive' ||
    paramFilter === 'locked'
      ? paramFilter
      : 'all'

  const setFilter = (next: UserFilter) => {
    if (next === 'all') setSearchParams({})
    else setSearchParams({ filter: next })
  }

  const { data: hospitals = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchHospitalOrganizations,
  })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-org-users'],
    queryFn: () => fetchProfiles({ includeInactive: true, excludeAdmins: true }),
  })

  const orgNameById = useMemo(
    () => new Map(hospitals.map((h) => [h.id, h.name])),
    [hospitals]
  )

  const orgSlugById = useMemo(() => buildOrgSlugLookup(hospitals).slugById, [hospitals])

  const enriched = useMemo<EnrichedUser[]>(
    () =>
      users.map((u) => ({
        ...u,
        orgName: orgNameById.get(u.org_id) ?? 'Unknown',
      })),
    [users, orgNameById]
  )

  const filtered = useMemo(() => {
    if (filter === 'all') return enriched
    return enriched.filter((u) => {
      const category = getProfileStatusCategory(u)
      if (filter === 'invited') return category === 'invitation_pending'
      return category === filter
    })
  }, [enriched, filter])

  const counts = useMemo(() => {
    const statusCounts = countProfileStatuses(enriched)
    return {
      all: enriched.length,
      active: statusCounts.active,
      invited: statusCounts.invitation_pending,
      inactive: statusCounts.inactive,
      locked: statusCounts.login_locked,
    }
  }, [enriched])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return dir * a.full_name.localeCompare(b.full_name)
        case 'email':
          return dir * (a.email ?? '').localeCompare(b.email ?? '')
        case 'organization':
          return dir * a.orgName.localeCompare(b.orgName)
        case 'role':
          return dir * a.role.localeCompare(b.role)
        case 'status':
          return dir * getProfileStatusBadge(a).label.localeCompare(getProfileStatusBadge(b).label)
        case 'lastLogin': {
          const aTime = a.last_login_at ? new Date(a.last_login_at).getTime() : 0
          const bTime = b.last_login_at ? new Date(b.last_login_at).getTime() : 0
          return dir * (aTime - bTime)
        }
        default:
          return 0
      }
    })
  }, [filtered, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'lastLogin' ? 'desc' : 'asc')
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Users"
        description="Staff across all organizations — filter, sort, review, and export."
        action={
          <Button
            variant="outline"
            size="sm"
            disabled={sorted.length === 0}
            onClick={() => exportUsersCsv(sorted)}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {USER_FILTERS.map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'default' : 'outline'}
            onClick={() => setFilter(key)}
          >
            {label} ({counts[key]})
          </Button>
        ))}
      </div>

      {actionMessage && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{actionMessage}</p>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users match this filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="p-3 pr-4">
                  <button type="button" className="font-medium hover:text-foreground" onClick={() => toggleSort('name')}>
                    Name{sortIndicator('name')}
                  </button>
                </th>
                <th className="p-3 pr-4">
                  <button type="button" className="font-medium hover:text-foreground" onClick={() => toggleSort('email')}>
                    Email{sortIndicator('email')}
                  </button>
                </th>
                <th className="p-3 pr-4">
                  <button
                    type="button"
                    className="font-medium hover:text-foreground"
                    onClick={() => toggleSort('organization')}
                  >
                    Organization{sortIndicator('organization')}
                  </button>
                </th>
                <th className="p-3 pr-4">
                  <button type="button" className="font-medium hover:text-foreground" onClick={() => toggleSort('role')}>
                    Role{sortIndicator('role')}
                  </button>
                </th>
                <th className="p-3 pr-4">
                  <button type="button" className="font-medium hover:text-foreground" onClick={() => toggleSort('status')}>
                    Status{sortIndicator('status')}
                  </button>
                </th>
                <th className="p-3 pr-4">
                  <button
                    type="button"
                    className="font-medium hover:text-foreground"
                    onClick={() => toggleSort('lastLogin')}
                  >
                    Last login{sortIndicator('lastLogin')}
                  </button>
                </th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => {
                const status = getProfileStatusBadge(u)
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-3 pr-4 font-medium">{u.full_name}</td>
                    <td className="p-3 pr-4 text-muted-foreground">{u.email ?? '—'}</td>
                    <td className="p-3 pr-4">{u.orgName}</td>
                    <td className="p-3 pr-4 capitalize">{u.role}</td>
                    <td className="p-3 pr-4">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="p-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {u.last_login_at ? formatDate(u.last_login_at) : 'Never'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <SendPasswordResetButton
                          orgId={u.org_id}
                          userId={u.id}
                          disabled={!u.email}
                          onSuccess={(message) => {
                            setActionError('')
                            setActionMessage(`${u.full_name}: ${message}`)
                          }}
                          onError={(message) => {
                            setActionMessage('')
                            setActionError(message)
                          }}
                        />
                        <Button type="button" size="sm" variant="outline" asChild>
                          <Link
                            to={adminOrganizationPath(
                              orgSlugById.get(u.org_id) ?? u.org_id
                            )}
                          >
                            Manage
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
