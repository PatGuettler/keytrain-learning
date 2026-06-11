import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteOrganization } from '@/services/organizations.service'

type DeleteStep = 'idle' | 'confirm' | 'type-name'

export function DeleteHospitalCard({
  orgId,
  hospitalName,
}: {
  orgId: string
  hospitalName: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<DeleteStep>('idle')
  const [typedName, setTypedName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const nameMatches = typedName === hospitalName

  const reset = () => {
    setStep('idle')
    setTypedName('')
    setError('')
  }

  const handleDelete = async () => {
    if (!nameMatches) return
    setLoading(true)
    setError('')
    try {
      await deleteOrganization(orgId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizations'] }),
        queryClient.invalidateQueries({ queryKey: ['all-org-users'] }),
        queryClient.invalidateQueries({ queryKey: ['org-users', orgId] }),
      ])
      navigate('/admin/organizations', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setLoading(false)
    }
  }

  const blockPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
  }

  const blockDrop = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Delete hospital
        </CardTitle>
        <CardDescription>
          Permanently removes this organization, all staff accounts, courses, assignments, and training
          records. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'idle' && (
          <Button type="button" variant="destructive" onClick={() => setStep('confirm')}>
            Delete this hospital
          </Button>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium">
              First confirmation: Are you sure you want to delete <strong>{hospitalName}</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              All users, courses, and training data for this hospital will be permanently deleted.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => setStep('type-name')}>
                Yes, continue with deletion
              </Button>
            </div>
          </div>
        )}

        {step === 'type-name' && (
          <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium">
              Second confirmation: Type the hospital name exactly to confirm deletion.
            </p>
            <p className="text-sm text-muted-foreground">
              Type <strong className="text-foreground">{hospitalName}</strong> below (pasting is disabled).
            </p>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm-name">Hospital name</Label>
              <Input
                id="delete-confirm-name"
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
                placeholder="Type the hospital name"
                className="font-mono"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={reset} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!nameMatches || loading}
                onClick={handleDelete}
              >
                {loading ? 'Deleting…' : 'Permanently delete hospital'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
