import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatJoinCodeDisplay } from '@/services/join-organization.service'
import { regenerateOrgJoinCode } from '@/services/user-management.service'
import type { Organization } from '@/types/user.types'

type OrgJoinCodeCardProps = {
  org: Organization
  memberCount: number
}

export function OrgJoinCodeCard({ org, memberCount }: OrgJoinCodeCardProps) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const joinCode = org.join_code ? formatJoinCodeDisplay(org.join_code) : null
  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/join`
      : 'https://keytrainlearning.com/join'

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateOrgJoinCode(org.id),
    onSuccess: () => {
      setError('')
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (e: Error) => setError(e.message),
  })

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  const shareBlurb = joinCode
    ? `Join KeyTrain Learning:\n1. Go to ${joinUrl}\n2. Enter join code: ${joinCode}\n3. Sign up with your work email`
    : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          Organization join code
        </CardTitle>
        <CardDescription>
          Staff can self-register at <code className="text-xs">/join</code> with this code instead
          of waiting for an email invite. The code ensures they land in <strong>{org.name}</strong>{' '}
          only ({memberCount} member{memberCount === 1 ? '' : 's'} today).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {joinCode ? (
          <div className="space-y-2">
            <Label htmlFor="org-join-code">Active join code</Label>
            <div className="flex gap-2">
              <Input
                id="org-join-code"
                readOnly
                value={joinCode}
                className="font-mono tracking-wider"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyText(joinCode)}
                title="Copy code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Copied to clipboard.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No join code yet. Generate one to let staff sign up at /join.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={joinCode ? 'outline' : 'default'}
            disabled={regenerateMutation.isPending}
            onClick={() => regenerateMutation.mutate()}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`}
            />
            {joinCode ? 'Regenerate code' : 'Generate join code'}
          </Button>
          {joinCode && (
            <Button type="button" variant="secondary" onClick={() => copyText(shareBlurb)}>
              Copy instructions for staff
            </Button>
          )}
        </div>

        {joinCode && (
          <p className="text-xs text-muted-foreground">
            Regenerating invalidates the old code immediately. Prefer email invites when you need to
            pre-assign manager or role — join-code signups default to <strong>employee</strong>.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
