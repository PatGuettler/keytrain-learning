import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
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
import { deleteOrgUser } from '@/services/user-management.service'
import type { Profile } from '@/types/user.types'

type DeleteStep = 'confirm' | 'type-name'

export function DeleteOrgUserDialog({
  open,
  onOpenChange,
  orgId,
  user,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  user: Profile | null
  onDeleted: () => void
}) {
  const [step, setStep] = useState<DeleteStep>('confirm')
  const [typedName, setTypedName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const confirmName = user?.full_name ?? ''
  const nameMatches = typedName === confirmName

  useEffect(() => {
    if (!open) {
      setStep('confirm')
      setTypedName('')
      setError('')
      setLoading(false)
    }
  }, [open])

  const blockPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
  }

  const blockDrop = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDelete = async () => {
    if (!user || !nameMatches) return
    setLoading(true)
    setError('')
    try {
      await deleteOrgUser(orgId, user.id)
      onDeleted()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Delete user
          </DialogTitle>
          <DialogDescription>
            Permanently removes this account, assignments, and training records. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {user && step === 'confirm' && (
          <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium">
              First confirmation: Are you sure you want to delete <strong>{user.full_name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              {user.email ? `${user.email} will lose access immediately. ` : ''}
              All training progress for this person will be permanently deleted.
            </p>
            <DialogFooter className="sm:justify-start gap-2 px-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => setStep('type-name')}>
                Yes, continue with deletion
              </Button>
            </DialogFooter>
          </div>
        )}

        {user && step === 'type-name' && (
          <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium">
              Second confirmation: Type the user&apos;s full name exactly to confirm deletion.
            </p>
            <p className="text-sm text-muted-foreground">
              Type <strong className="text-foreground">{confirmName}</strong> below (pasting is
              disabled).
            </p>
            <div className="space-y-2">
              <Label htmlFor="delete-user-confirm-name">Full name</Label>
              <Input
                id="delete-user-confirm-name"
                value={typedName}
                onChange={(e) => {
                  setTypedName(e.target.value)
                  setError('')
                }}
                onPaste={blockPaste}
                onDragOver={blockDrop}
                onDrop={blockDrop}
                autoComplete="off"
                spellCheck={false}
                placeholder="Type the user's full name"
                className="font-mono"
              />
            </div>
            {error && <p className="text-sm text-destructive whitespace-pre-line">{error}</p>}
            <DialogFooter className="sm:justify-start gap-2 px-0">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  setStep('confirm')
                  setTypedName('')
                  setError('')
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!nameMatches || loading}
                onClick={() => void handleDelete()}
              >
                {loading ? 'Deleting…' : 'Permanently delete user'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
