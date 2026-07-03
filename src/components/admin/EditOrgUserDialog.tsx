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
import { Switch } from '@/components/ui/switch'
import { updateOrgUser, sendUserPasswordReset, unlockUserLogin } from '@/services/user-management.service'
import type { Profile, UserRole } from '@/types/user.types'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function EditOrgUserDialog({
  open,
  onOpenChange,
  orgId,
  user,
  managers,
  hiveOrgId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  user: Profile | null
  managers: Profile[]
  hiveOrgId: string | null
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('employee')
  const [managerId, setManagerId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [railnetEnabled, setRailnetEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [securityLoading, setSecurityLoading] = useState<'unlock' | 'reset' | null>(null)
  const [securityMessage, setSecurityMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setFullName(user.full_name)
    setRole(user.role === 'manager' ? 'manager' : 'employee')
    setManagerId(user.manager_id ?? '')
    setIsActive(user.is_active)
    setRailnetEnabled(user.railnet_enabled === true)
    setError('')
    setSecurityMessage('')
  }, [user, open])

  const managerOptions = managers.filter((m) => m.id !== user?.id)

  const handleUnlockLogin = async () => {
    if (!user) return
    setSecurityLoading('unlock')
    setSecurityMessage('')
    setError('')
    try {
      const result = await unlockUserLogin(orgId, user.id)
      setSecurityMessage(result.message)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unlock failed')
    } finally {
      setSecurityLoading(null)
    }
  }

  const handleSendPasswordReset = async () => {
    if (!user) return
    setSecurityLoading('reset')
    setSecurityMessage('')
    setError('')
    try {
      const result = await sendUserPasswordReset(orgId, user.id)
      setSecurityMessage(result.message)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send reset email')
    } finally {
      setSecurityLoading(null)
    }
  }

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
        railnet_enabled?: boolean
      } = {}

      if (trimmedName !== user.full_name) patch.full_name = trimmedName
      if (role !== user.role) patch.role = role
      if (role === 'employee' && (managerId || null) !== (user.manager_id ?? null)) {
        patch.manager_id = managerId || null
      }
      if (role === 'manager' && user.role === 'employee') patch.manager_id = null
      if (isActive !== user.is_active) patch.is_active = isActive
      if (railnetEnabled !== user.railnet_enabled) patch.railnet_enabled = railnetEnabled

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

            <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-user-railnet">RailNet access</Label>
                  <p className="text-sm text-muted-foreground">
                    User can view RailNet dashboards for this organization only.
                  </p>
                </div>
                <Switch
                  id="edit-user-railnet"
                  checked={railnetEnabled}
                  disabled={!hiveOrgId?.trim()}
                  onCheckedChange={setRailnetEnabled}
                />
              </div>
              {!hiveOrgId?.trim() && (
                <p className="text-sm text-muted-foreground">
                  Set the RailNet AWS org id in organization settings before granting access.
                </p>
              )}
              {hiveOrgId?.trim() && (
                <p className="text-xs text-muted-foreground">
                  The user may need to sign out and back in for the RailNet tab to appear.
                </p>
              )}
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <p className="text-sm font-medium">Account access</p>
              {user.login_locked_at && (
                <p className="text-sm text-destructive">
                  Login locked after too many failed sign-in attempts.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={securityLoading !== null}
                  onClick={() => void handleUnlockLogin()}
                >
                  {securityLoading === 'unlock' ? 'Unlocking…' : 'Unlock login'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={securityLoading !== null}
                  onClick={() => void handleSendPasswordReset()}
                >
                  {securityLoading === 'reset' ? 'Sending…' : 'Send password reset'}
                </Button>
              </div>
              {securityMessage && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{securityMessage}</p>
              )}
            </div>

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
