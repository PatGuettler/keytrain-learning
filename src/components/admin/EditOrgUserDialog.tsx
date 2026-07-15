import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { BillingImpactConfirmDialog } from '@/components/billing/BillingImpactConfirmDialog'
import { previewSeatDelta } from '@/lib/org-billing'
import { isBillableRole } from '@/lib/org-billing'
import type { OrgBillingTerms } from '@/lib/seat-pricing'
import { formatUsdFromCents } from '@/lib/seat-pricing'
import { PLATFORM_ORG_ID } from '@/lib/constants'
import { fetchHospitalOrganizations } from '@/services/organizations.service'
import { fetchMyOrgMemberships } from '@/services/org-memberships.service'
import {
  updateOrgUser,
  moveOrgUser,
  sendUserPasswordReset,
  unlockUserLogin,
} from '@/services/user-management.service'
import { useAuthStore } from '@/store/authStore'
import type { Profile, UserRole } from '@/types/user.types'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function EditOrgUserDialog({
  open,
  onOpenChange,
  orgId,
  user,
  managers,
  orgUsers,
  billingTerms,
  allowOrgAdminRole = false,
  railnetOrgId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  user: Profile | null
  managers: Profile[]
  orgUsers: Profile[]
  billingTerms: OrgBillingTerms | null
  /** KTL platform admins can assign org_admin */
  allowOrgAdminRole?: boolean
  railnetOrgId: string | null
  onSaved: (result?: { movedToOrgId?: string }) => void
}) {
  const profile = useAuthStore((s) => s.profile)
  const isKtlAdmin = profile?.role === 'admin'
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('employee')
  const [managerId, setManagerId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [railnetEnabled, setRailnetEnabled] = useState(false)
  const [destinationOrgId, setDestinationOrgId] = useState('')
  const [loading, setLoading] = useState(false)
  const [securityLoading, setSecurityLoading] = useState<'unlock' | 'reset' | null>(null)
  const [securityMessage, setSecurityMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false)

  const { data: destinationOrgs = [] } = useQuery({
    queryKey: ['edit-user-destination-orgs', profile?.id, isKtlAdmin],
    queryFn: async () => {
      if (isKtlAdmin) {
        const orgs = await fetchHospitalOrganizations()
        return orgs
          .filter((o) => o.id !== PLATFORM_ORG_ID)
          .map((o) => ({ id: o.id, name: o.name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      }
      const memberships = await fetchMyOrgMemberships()
      return memberships
        .filter((m) => m.role === 'org_admin' && m.is_active)
        .map((m) => ({
          id: m.org_id,
          name: m.organization?.name ?? m.org_id,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    enabled: open && Boolean(profile?.id),
  })

  const otherOrgs = useMemo(
    () => destinationOrgs.filter((o) => o.id !== orgId),
    [destinationOrgs, orgId]
  )

  const canMoveOrgAdmin = isKtlAdmin || user?.role !== 'org_admin'
  const canOfferMove = otherOrgs.length > 0 && Boolean(user) && canMoveOrgAdmin

  useEffect(() => {
    if (!user) return
    setFullName(user.full_name)
    setRole(
      user.role === 'org_admin' || user.role === 'manager' || user.role === 'employee'
        ? user.role
        : 'employee'
    )
    setManagerId(user.manager_id ?? '')
    setIsActive(user.is_active)
    setRailnetEnabled(user.railnet_enabled === true)
    setDestinationOrgId('')
    setError('')
    setSecurityMessage('')
    setConfirmOpen(false)
    setMoveConfirmOpen(false)
  }, [user, open])

  const managerOptions = managers.filter((m) => m.id !== user?.id)
  const isMoving = Boolean(destinationOrgId && destinationOrgId !== orgId)

  const seatImpact = useMemo(() => {
    if (!user || !billingTerms || isMoving) return null
    const roleChanged = role !== user.role
    const activeChanged = isActive !== user.is_active
    if (!roleChanged && !activeChanged) return null
    if (!isBillableRole(role) && role !== user.role) return null
    return previewSeatDelta(billingTerms, orgUsers, {
      replaceUser: { id: user.id, role, is_active: isActive },
    })
  }, [user, billingTerms, orgUsers, role, isActive, isMoving])

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

  const applySave = async () => {
    if (!user) return
    const trimmedName = fullName.trim()
    if (!trimmedName) {
      setError('Full name is required.')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (isMoving) {
        if (trimmedName !== user.full_name) {
          await updateOrgUser(orgId, user.id, { full_name: trimmedName })
        }
        await moveOrgUser(orgId, user.id, destinationOrgId)
        onSaved({ movedToOrgId: destinationOrgId })
        setMoveConfirmOpen(false)
        onOpenChange(false)
        return
      }

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
      if ((role === 'manager' || role === 'org_admin') && user.role === 'employee') {
        patch.manager_id = null
      }
      if (isActive !== user.is_active) patch.is_active = isActive
      if (railnetEnabled !== (user.railnet_enabled === true)) patch.railnet_enabled = railnetEnabled

      if (Object.keys(patch).length === 0) {
        onOpenChange(false)
        return
      }

      await updateOrgUser(orgId, user.id, patch)
      onSaved()
      setConfirmOpen(false)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveClick = () => {
    if (!user) return
    const trimmedName = fullName.trim()
    if (!trimmedName) {
      setError('Full name is required.')
      return
    }
    if (isMoving) {
      setMoveConfirmOpen(true)
      return
    }
    if (seatImpact && seatImpact.deltaCents !== 0) {
      setConfirmOpen(true)
      return
    }
    if (seatImpact && (role !== user.role || isActive !== user.is_active)) {
      setConfirmOpen(true)
      return
    }
    void applySave()
  }

  const destinationName =
    otherOrgs.find((o) => o.id === destinationOrgId)?.name ?? 'the selected organization'

  return (
    <>
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
              {canOfferMove && (
                <div className="space-y-2">
                  <Label htmlFor="edit-user-org">Organization</Label>
                  <select
                    id="edit-user-org"
                    className={selectClass}
                    value={destinationOrgId || orgId}
                    onChange={(e) => {
                      const next = e.target.value
                      setDestinationOrgId(next === orgId ? '' : next)
                    }}
                  >
                    <option value={orgId}>Stay in current organization</option>
                    {otherOrgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        Move to {o.name}
                      </option>
                    ))}
                  </select>
                  {isMoving && (
                    <p className="text-xs text-muted-foreground">
                      Leaves this org, clears manager, and syncs required training for the destination.
                    </p>
                  )}
                </div>
              )}
              {!isMoving && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-user-role">Role</Label>
                    <select
                      id="edit-user-role"
                      className={selectClass}
                      value={role}
                      onChange={(e) => {
                        const nextRole = e.target.value as UserRole
                        setRole(nextRole)
                        if (nextRole !== 'employee') setManagerId('')
                      }}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      {allowOrgAdminRole && <option value="org_admin">Org admin</option>}
                    </select>
                    {billingTerms && isBillableRole(role) && (
                      <p className="text-xs text-muted-foreground">
                        Seat rate:{' '}
                        {formatUsdFromCents(
                          role === 'org_admin'
                            ? billingTerms.org_admin_cents
                            : role === 'manager'
                              ? billingTerms.manager_cents
                              : billingTerms.employee_cents
                        )}
                        /mo
                      </p>
                    )}
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
                          User can open the RailNet tab and view reports for this organization only.
                        </p>
                      </div>
                      <Switch
                        id="edit-user-railnet"
                        checked={railnetEnabled}
                        disabled={!railnetOrgId?.trim()}
                        onCheckedChange={setRailnetEnabled}
                      />
                    </div>
                    {!railnetOrgId?.trim() && (
                      <p className="text-sm text-muted-foreground">
                        Set the RailNet AWS org id in organization settings before granting access.
                      </p>
                    )}
                  </div>
                </>
              )}

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
            <Button type="button" disabled={loading || !user} onClick={handleSaveClick}>
              {loading ? (isMoving ? 'Moving…' : 'Saving…') : isMoving ? 'Move user' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveConfirmOpen} onOpenChange={setMoveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm move</DialogTitle>
            <DialogDescription>
              {user
                ? `Move ${user.full_name} to ${destinationName}? They will leave this organization and their manager assignment will be cleared.`
                : 'Confirm move'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setMoveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={loading} onClick={() => void applySave()}>
              {loading ? 'Moving…' : 'Confirm move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {seatImpact && (
        <BillingImpactConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirm billing change"
          description={
            user
              ? `${user.full_name}: ${user.role} → ${role}${isActive !== user.is_active ? `, active ${user.is_active} → ${isActive}` : ''}`
              : 'Confirm seat change'
          }
          current={seatImpact.current}
          next={seatImpact.next}
          deltaCents={seatImpact.deltaCents}
          confirmLabel="Confirm and update role"
          loading={loading}
          onConfirm={() => void applySave()}
        />
      )}
    </>
  )
}
