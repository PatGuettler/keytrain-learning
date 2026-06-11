import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateOrgUser } from '@/services/user-management.service'
import type { Profile, UserRole } from '@/types/user.types'

const selectClass =
  'h-8 rounded-md border border-input bg-background px-2 text-xs capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface UserDraft {
  role: UserRole
  manager_id: string | null
}

function draftsEqual(a: UserDraft, b: UserDraft): boolean {
  return a.role === b.role && a.manager_id === b.manager_id
}

function savedDraft(user: Profile): UserDraft {
  return { role: user.role, manager_id: user.manager_id }
}

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
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setDrafts(Object.fromEntries(users.map((u) => [u.id, savedDraft(u)])))
  }, [users])

  const savedById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, savedDraft(u)])),
    [users]
  )

  const setDraft = (userId: string, patch: Partial<UserDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], ...patch },
    }))
    setError('')
  }

  const resetDraft = (user: Profile) => {
    setDrafts((prev) => ({
      ...prev,
      [user.id]: savedDraft(user),
    }))
    setError('')
  }

  const saveDraft = async (user: Profile) => {
    const draft = drafts[user.id] ?? savedDraft(user)
    const saved = savedById[user.id] ?? savedDraft(user)

    if (draftsEqual(draft, saved)) return

    if (draft.role !== saved.role) {
      const confirmed = window.confirm(
        `Change ${user.full_name} from ${saved.role} to ${draft.role}?`
      )
      if (!confirmed) return
    }

    setSavingId(user.id)
    setError('')
    try {
      const patch: {
        role?: UserRole
        manager_id?: string | null
      } = {}

      if (draft.role !== saved.role) patch.role = draft.role
      if (draft.role === 'employee' && draft.manager_id !== saved.manager_id) {
        patch.manager_id = draft.manager_id
      }
      if (draft.role === 'manager' && saved.role === 'employee') {
        patch.manager_id = null
      }

      await updateOrgUser(orgId, user.id, patch)
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
              <th className="p-3 pr-4">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const draft = drafts[u.id] ?? savedDraft(u)
              const saved = savedById[u.id] ?? savedDraft(u)
              const dirty = !draftsEqual(draft, saved)
              const isSaving = savingId === u.id

              return (
                <tr
                  key={u.id}
                  className={`border-b last:border-0 ${dirty ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}`}
                >
                  <td className="p-3 pr-4 font-medium">{u.full_name}</td>
                  <td className="p-3 pr-4 text-muted-foreground">{u.email ?? '—'}</td>
                  <td className="p-3 pr-4">
                    <select
                      className={selectClass}
                      value={draft.role}
                      disabled={isSaving}
                      onChange={(e) => {
                        const role = e.target.value as UserRole
                        setDraft(u.id, {
                          role,
                          manager_id: role === 'manager' ? null : draft.manager_id,
                        })
                      }}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                    </select>
                  </td>
                  <td className="p-3 pr-4">
                    {draft.role === 'employee' ? (
                      <select
                        className={selectClass}
                        value={draft.manager_id ?? ''}
                        disabled={isSaving}
                        onChange={(e) =>
                          setDraft(u.id, {
                            manager_id: e.target.value || null,
                          })
                        }
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
                  <td className="p-3 pr-4">
                    <Badge variant={u.is_active ? 'success' : 'secondary'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {dirty ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => void saveDraft(u)}
                        >
                          {isSaving ? 'Saving…' : 'Save'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isSaving}
                          onClick={() => resetDraft(u)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Role and manager changes are not applied until you click Save.
      </p>
    </div>
  )
}
