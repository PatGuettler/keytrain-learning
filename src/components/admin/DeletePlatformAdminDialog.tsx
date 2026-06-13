import { useState } from 'react'
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
import { deletePlatformAdmin } from '@/services/user-management.service'
import type { Profile } from '@/types/user.types'

export function DeletePlatformAdminDialog({
  open,
  onOpenChange,
  admin,
  currentUserId,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  admin: Profile | null
  currentUserId: string
  onDeleted: () => void
}) {
  const [confirmName, setConfirmName] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setConfirmName('')
    setStep(1)
    setError('')
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleDelete = async () => {
    if (!admin) return
    setLoading(true)
    setError('')
    try {
      await deletePlatformAdmin(admin.id)
      onDeleted()
      handleClose(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  const isSelf = admin?.id === currentUserId
  const nameMatches = admin && confirmName.trim() === admin.full_name

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete platform admin</DialogTitle>
          <DialogDescription>
            {isSelf
              ? 'You cannot delete your own admin account while signed in.'
              : `Permanently remove ${admin?.full_name ?? 'this admin'}? At least one admin must remain.`}
          </DialogDescription>
        </DialogHeader>

        {admin && !isSelf && (
          <div className="space-y-4 py-2">
            {step === 1 ? (
              <p className="text-sm text-muted-foreground">
                This removes their login and platform access. They will no longer be able to sign in.
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="confirm-admin-name">
                  Type <strong>{admin.full_name}</strong> to confirm
                </Label>
                <Input
                  id="confirm-admin-name"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => handleClose(false)}>
            Cancel
          </Button>
          {!isSelf && admin && step === 1 && (
            <Button type="button" variant="destructive" onClick={() => setStep(2)}>
              Continue
            </Button>
          )}
          {!isSelf && admin && step === 2 && (
            <Button
              type="button"
              variant="destructive"
              disabled={loading || !nameMatches}
              onClick={() => void handleDelete()}
            >
              {loading ? 'Deleting…' : 'Delete admin'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
