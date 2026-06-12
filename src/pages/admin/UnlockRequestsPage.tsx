import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUnlockRequests, resolveUnlockRequest } from '@/services/unlock-requests.service'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export function UnlockRequestsPage() {
  const adminId = useAuthStore((s) => s.userId)!
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'pending' | 'approved' | 'denied' | 'all'>('pending')
  const [actingId, setActingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['unlock-requests', filter],
    queryFn: () => fetchUnlockRequests(filter === 'all' ? undefined : filter),
  })

  const handleResolve = async (requestId: string, approved: boolean) => {
    setActingId(requestId)
    setActionError('')
    try {
      await resolveUnlockRequest(requestId, approved, adminId)
      await queryClient.invalidateQueries({ queryKey: ['unlock-requests'] })
      await queryClient.invalidateQueries({ queryKey: ['assignments'] })
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not resolve unlock request.')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Unlock requests"
        description="Staff who exhaust course attempts request access here. Approving resets their attempts."
      />

      <div className="flex flex-wrap gap-2">
        {(['pending', 'approved', 'denied', 'all'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading requests…</p>
      ) : requests.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="p-6 text-sm text-muted-foreground">No unlock requests.</CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => (
            <li key={req.id}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {req.user?.full_name ?? 'User'} — {req.course?.title ?? 'Course'}
                    </CardTitle>
                    <Badge
                      variant={
                        req.status === 'pending'
                          ? 'warning'
                          : req.status === 'approved'
                            ? 'success'
                            : 'secondary'
                      }
                    >
                      {req.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {req.organization?.name ?? 'Organization'} · Requested {formatDate(req.requested_at)}
                  </p>
                  {req.message && <p className="rounded-md border bg-muted/30 p-3">{req.message}</p>}
                  {req.status === 'pending' && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={actingId === req.id}
                        onClick={() => void handleResolve(req.id, true)}
                      >
                        {actingId === req.id ? 'Working…' : 'Approve & unlock'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actingId === req.id}
                        onClick={() => void handleResolve(req.id, false)}
                      >
                        Deny
                      </Button>
                    </div>
                  )}
                  {req.resolved_at && (
                    <p className="text-xs text-muted-foreground">Resolved {formatDate(req.resolved_at)}</p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
