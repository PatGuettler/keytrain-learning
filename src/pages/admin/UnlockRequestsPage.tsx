import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import {
  deleteUnlockRequest,
  deleteUnlockRequests,
  fetchUnlockRequests,
  resolveUnlockRequest,
} from '@/services/unlock-requests.service'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { UnlockRequestStatus } from '@/types/course.types'

type Filter = UnlockRequestStatus | 'all'

const FILTER_LABELS: Record<Filter, string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
  all: 'All',
}

export function UnlockRequestsPage({ allowDelete = true }: { allowDelete?: boolean }) {
  const adminId = useAuthStore((s) => s.userId)!
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('pending')
  const [actingId, setActingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['unlock-requests', filter],
    queryFn: () => fetchUnlockRequests(filter === 'all' ? undefined : filter),
  })

  useEffect(() => {
    setSelectedIds(new Set())
  }, [filter])

  const allVisibleSelected =
    requests.length > 0 && requests.every((req) => selectedIds.has(req.id))

  const filterDeleteLabel = useMemo(() => {
    if (filter === 'all') return 'all unlock requests'
    return `all ${FILTER_LABELS[filter].toLowerCase()} requests`
  }, [filter])

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['unlock-requests'] })
    await queryClient.invalidateQueries({ queryKey: ['assignments'] })
  }

  const handleResolve = async (requestId: string, approved: boolean) => {
    setActingId(requestId)
    setActionError('')
    try {
      await resolveUnlockRequest(requestId, approved, adminId)
      await invalidate()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not resolve unlock request.')
    } finally {
      setActingId(null)
    }
  }

  const handleDeleteOne = async (requestId: string) => {
    if (!window.confirm('Delete this unlock request? This cannot be undone.')) return
    setDeleting(true)
    setActionError('')
    try {
      await deleteUnlockRequest(requestId)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
      await invalidate()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete unlock request.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSelected = async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    if (
      !window.confirm(
        `Delete ${ids.length} selected unlock request${ids.length === 1 ? '' : 's'}? This cannot be undone.`
      )
    ) {
      return
    }
    setDeleting(true)
    setActionError('')
    try {
      await deleteUnlockRequests({ ids })
      setSelectedIds(new Set())
      await invalidate()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete selected requests.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAllVisible = async () => {
    if (requests.length === 0) return
    if (
      !window.confirm(
        `Delete ${filterDeleteLabel} (${requests.length} shown)? This cannot be undone.`
      )
    ) {
      return
    }
    setDeleting(true)
    setActionError('')
    try {
      if (filter === 'all') {
        await deleteUnlockRequests({})
      } else {
        await deleteUnlockRequests({ status: filter })
      }
      setSelectedIds(new Set())
      await invalidate()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete requests.')
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(requests.map((req) => req.id)))
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Unlock requests"
        description={
          allowDelete
            ? 'Staff who exhaust course attempts request access here. Approving resets their attempts. Delete old requests to clear history.'
            : 'Staff who exhaust course attempts request access here. Approving resets their attempts for your organization.'
        }
        action={
          allowDelete && requests.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={deleting || selectedIds.size === 0}
                onClick={() => void handleDeleteSelected()}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete selected ({selectedIds.size})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={() => void handleDeleteAllVisible()}
              >
                Clear {filter === 'all' ? 'all' : FILTER_LABELS[filter].toLowerCase()}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        {(['pending', 'approved', 'denied', 'all'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABELS[f]}
          </Button>
        ))}
      </div>

      {allowDelete && requests.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer w-fit">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={allVisibleSelected}
            onChange={toggleSelectAllVisible}
          />
          Select all on this page ({requests.length})
        </label>
      )}

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
                    <div className="flex items-start gap-3 min-w-0">
                      {allowDelete ? (
                        <input
                          type="checkbox"
                          className="h-4 w-4 mt-1 rounded border-input shrink-0"
                          checked={selectedIds.has(req.id)}
                          onChange={(e) => toggleSelected(req.id, e.target.checked)}
                          aria-label={`Select request from ${req.user?.full_name ?? 'user'}`}
                        />
                      ) : null}
                      <CardTitle className="text-base">
                        {req.user?.full_name ?? 'User'} — {req.course?.title ?? 'Course'}
                      </CardTitle>
                    </div>
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
                  <div className="flex flex-wrap gap-2">
                    {req.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          disabled={actingId === req.id || deleting}
                          onClick={() => void handleResolve(req.id, true)}
                        >
                          {actingId === req.id ? 'Working…' : 'Approve & unlock'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actingId === req.id || deleting}
                          onClick={() => void handleResolve(req.id, false)}
                        >
                          Deny
                        </Button>
                      </>
                    )}
                    {allowDelete ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleting || actingId === req.id}
                        onClick={() => void handleDeleteOne(req.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
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
