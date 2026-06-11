import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { updateOrgUser } from '@/services/user-management.service'
import type { Profile, UserRole } from '@/types/user.types'

const selectClass =
  'h-8 rounded-md border border-input bg-background px-2 text-xs capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function OrgUsersTable({
  orgId,
  users,
  managers,
}: {
  orgId: string
  users: Profile[]
  managers: Profile[]
}) {
  const queryClient = useQueryClient()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const updateRole = async (user: Profile, role: UserRole) => {
    setSavingId(user.id)
    setError('')
    try {
      await updateOrgUser(orgId, user.id, {
        role,
        manager_id: role === 'employee' ? user.manager_id : null,
      })
      await queryClient.invalidateQueries({ queryKey: ['org-users', orgId] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSavingId(null)
    }
  }

  const updateManager = async (user: Profile, managerId: string) => {
    setSavingId(user.id)
    setError('')
    try {
      await updateOrgUser(orgId, user.id, {
        manager_id: managerId || null,
      })
      await queryClient.invalidateQueries({ queryKey: ['org-users', orgId] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSavingId(null)
    }
  }

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No users in this organization yet.</p>
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 pr-4">Name</th>
              <th className="p-3 pr-4">Email</th>
              <th className="p-3 pr-4">Role</th>
              <th className="p-3 pr-4">Manager</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3 pr-4 font-medium">{u.full_name}</td>
                <td className="p-3 pr-4 text-muted-foreground">{u.email ?? '—'}</td>
                <td className="p-3 pr-4">
                  <select
                    className={selectClass}
                    value={u.role}
                    disabled={savingId === u.id}
                    onChange={(e) => updateRole(u, e.target.value as UserRole)}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </td>
                <td className="p-3 pr-4">
                  {u.role === 'employee' ? (
                    <select
                      className={selectClass}
                      value={u.manager_id ?? ''}
                      disabled={savingId === u.id}
                      onChange={(e) => updateManager(u, e.target.value)}
                    >
                      <option value="">—</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3">
                  <Badge variant={u.is_active ? 'success' : 'secondary'}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
