import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Hexagon } from 'lucide-react'
import { updateOrganization } from '@/services/organizations.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type RailNetOrgSetupCardProps = {
  orgId: string
  initialHiveOrgId: string
  usersWithRailnet: number
  totalUsers: number
}

export function RailNetOrgSetupCard({
  orgId,
  initialHiveOrgId,
  usersWithRailnet,
  totalUsers,
}: RailNetOrgSetupCardProps) {
  const queryClient = useQueryClient()
  const [hiveOrgId, setHiveOrgId] = useState(initialHiveOrgId)
  const [savedHiveOrgId, setSavedHiveOrgId] = useState(initialHiveOrgId)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setHiveOrgId(initialHiveOrgId)
    setSavedHiveOrgId(initialHiveOrgId)
  }, [initialHiveOrgId, orgId])

  const configured = Boolean(savedHiveOrgId.trim())
  const changed = hiveOrgId.trim() !== savedHiveOrgId

  const saveMutation = useMutation({
    mutationFn: (value: string) =>
      updateOrganization(orgId, { hive_org_id: value.trim() || null }),
    onSuccess: () => {
      const trimmed = hiveOrgId.trim()
      setSavedHiveOrgId(trimmed)
      setError('')
      setSuccess('RailNet AWS org id saved.')
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
      void queryClient.invalidateQueries({ queryKey: ['organization', orgId] })
    },
    onError: (e: Error) => {
      setSuccess('')
      setError(e.message)
    },
  })

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Hexagon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">RailNet setup</CardTitle>
        </div>
        <CardDescription>
          Step 1: link this organization to AWS. Step 2: enable access per user in the table
          below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <p>
            <span className="font-medium">Status:</span>{' '}
            {configured ? (
              <>
                Linked to <code className="text-xs">{savedHiveOrgId}</code>
              </>
            ) : (
              'Not linked — enter an AWS org id and save.'
            )}
          </p>
          <p className="text-muted-foreground">
            {usersWithRailnet} of {totalUsers} user{totalUsers === 1 ? '' : 's'} with RailNet
            access enabled.
          </p>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!changed) return
            saveMutation.mutate(hiveOrgId)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="railnet-aws-org-id">Step 1 — AWS org id</Label>
            <Input
              id="railnet-aws-org-id"
              value={hiveOrgId}
              onChange={(e) => {
                setHiveOrgId(e.target.value)
                setSuccess('')
                setError('')
              }}
              placeholder="hive-test-alpha"
            />
            <p className="text-sm text-muted-foreground">
              Must match the org id in AWS DynamoDB (e.g. seeded test orgs like{' '}
              <code className="text-xs">hive-test-alpha</code>).
            </p>
          </div>
          <Button type="submit" disabled={!changed || saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save AWS org id'}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Step 2:</span> scroll to{' '}
          <span className="font-medium text-foreground">Users</span>, click{' '}
          <span className="font-medium text-foreground">Edit</span> on a user, and turn on{' '}
          <span className="font-medium text-foreground">RailNet access</span>.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
      </CardContent>
    </Card>
  )
}
