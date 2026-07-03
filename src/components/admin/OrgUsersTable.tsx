import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeleteOrgUserDialog } from '@/components/admin/DeleteOrgUserDialog'
import { EditOrgUserDialog } from '@/components/admin/EditOrgUserDialog'
import { SendPasswordResetButton } from '@/components/admin/SendPasswordResetButton'
import { getProfileStatusBadge } from '@/lib/user-status'
import type { Profile } from '@/types/user.types'

function managerName(managers: Profile[], managerId: string | null): string {
  if (!managerId) return '—'
  return managers.find((m) => m.id === managerId)?.full_name ?? '—'
}

export function OrgUsersTable({
  orgId,
  users,
  managers,
  hiveOrgId,
}: {
  orgId: string
  users: Profile[]
  managers: Profile[]
  hiveOrgId: string | null
}) {
  const queryClient = useQueryClient()
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const refreshUsers = () => {
    void queryClient.invalidateQueries({ queryKey: ['org-users', orgId] })
    void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    void queryClient.invalidateQueries({ queryKey: ['all-org-users'] })
  }

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No users in this organization yet.</p>
  }

  return (
    <>
      {actionMessage && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{actionMessage}</p>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 pr-4">Name</th>
              <th className="p-3 pr-4">Email</th>
              <th className="p-3 pr-4">Role</th>
              <th className="p-3 pr-4">Manager</th>
              <th className="p-3 pr-4">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3 pr-4 font-medium">{u.full_name}</td>
                <td className="p-3 pr-4 text-muted-foreground">{u.email ?? '—'}</td>
                <td className="p-3 pr-4 capitalize">{u.role}</td>
                <td className="p-3 pr-4 text-muted-foreground">
                  {u.role === 'employee' ? managerName(managers, u.manager_id) : '—'}
                </td>
                <td className="p-3 pr-4">
                  {(() => {
                    const status = getProfileStatusBadge(u)
                    return <Badge variant={status.variant}>{status.label}</Badge>
                  })()}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditUser(u)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <SendPasswordResetButton
                      orgId={orgId}
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
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => setDeleteUser(u)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditOrgUserDialog
        open={Boolean(editUser)}
        onOpenChange={(open) => {
          if (!open) setEditUser(null)
        }}
        orgId={orgId}
        user={editUser}
        managers={managers}
        hiveOrgId={hiveOrgId}
        onSaved={refreshUsers}
      />

      <DeleteOrgUserDialog
        open={Boolean(deleteUser)}
        onOpenChange={(open) => {
          if (!open) setDeleteUser(null)
        }}
        orgId={orgId}
        user={deleteUser}
        onDeleted={refreshUsers}
      />
    </>
  )
}
