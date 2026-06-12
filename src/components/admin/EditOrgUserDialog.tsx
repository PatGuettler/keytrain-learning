import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateOrgUser } from '@/services/user-management.service'
import type { Profile, UserRole } from '@/types/user.types'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function EditOrgUserDialog({
  open,
  onOpenChange,
  orgId,
  user,
  managers,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  user: Profile | null
  managers: Profile[]
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('employee')
  const [managerId, setManagerId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setFullName(user.full_name)
    setRole(user.role === 'manager' ? 'manager' : 'employee')
    setManagerId(user.manager_id ?? '')
    setIsActive(user.is_active)
    setError('')
  }, [user, open])

  const managerOptions = managers.filter((m) => m.id !== user?.id)

  const handleSave = async () => {
    if (!user) return
    const trimmedName = fullName.trim()
    if (!trimmedName) {
      setError('Full name is required.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const patch: {
        full_name?: string
        role?: UserRole
        manager_id?: string | null
        is_active?: boolean
      } = {}

      if (trimmedName !== user.full_name) patch.full_name = trimmedName
      if (role !== user.role) patch.role = role
      if (role === 'employee' && (managerId || null) !== (user.manager_id ?? null)) {
        patch.manager_id = managerId || null
      }
      if (role === 'manager' && user.role === 'employee') patch.manager_id = null
      if (isActive !== user.is_active) patch.is_active = isActive

      if (Object.keys(patch).length === 0) {
        onOpenChange(false)
        return
      }

      await updateOrgUser(orgId, user.id, patch)
      onSaved()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update {user?.full_name ?? 'this user'}&apos;s profile for this organization.
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Full name</Label>
              <Input
                id="edit-user-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input id="edit-user-email" value={user.email ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-role">Role</Label>
              <select
                id="edit-user-role"
                className={selectClass}
                value={role}
                onChange={(e) => {
                  const nextRole = e.target.value as UserRole
                  setRole(nextRole)
                  if (nextRole === 'manager') setManagerId('')
                }}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            {role === 'employee' && (
              <div className="space-y-2">
                <Label htmlFor="edit-user-manager">Manager</Label>
                <select
                  id="edit-user-manager"
                  className={selectClass}
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                >
                  <option value="">No manager assigned</option>
                  {managerOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-input"
              />
              Active account (can sign in and take training)
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={loading || !user} onClick={() => void handleSave()}>
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
