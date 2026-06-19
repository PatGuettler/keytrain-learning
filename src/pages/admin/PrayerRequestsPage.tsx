import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import {
  deletePrayerRequest,
  fetchPrayerRequests,
  markPrayerRequestPrayed,
} from '@/services/prayer-admin.service'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function PrayerRequestsPage() {
  const adminId = useAuthStore((s) => s.userId)!
  const queryClient = useQueryClient()
  const [actingId, setActingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['prayer-requests'],
    queryFn: fetchPrayerRequests,
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['prayer-requests'] })
  }

  const handleMarkPrayed = async (requestId: string) => {
    setActingId(requestId)
    setActionError('')
    try {
      await markPrayerRequestPrayed(requestId, adminId)
      await invalidate()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not mark as prayed.')
    } finally {
      setActingId(null)
    }
  }

  const handleDelete = async (requestId: string) => {
    if (!window.confirm('Delete this prayer request? This cannot be undone.')) return
    setDeletingId(requestId)
    setActionError('')
    try {
      await deletePrayerRequest(requestId)
      await invalidate()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete prayer request.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Prayer requests"
        description="Anonymous prayer requests from users. Mark when you have prayed and remove requests when appropriate."
      />

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading prayer requests…</p>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No prayer requests yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const hasPrayed = request.prayers?.some((p) => p.admin_id === adminId) ?? false
            return (
              <Card key={request.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base font-normal">
                      Submitted {formatDate(request.created_at)}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={deletingId === request.id}
                      onClick={() => handleDelete(request.id)}
                      aria-label="Delete prayer request"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm whitespace-pre-wrap">{request.message}</p>

                  {(request.prayers?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {request.prayers.map((prayer) => (
                        <Badge key={`${prayer.request_id}-${prayer.admin_id}`} variant="secondary">
                          {prayer.admin?.full_name ?? 'Admin'} · {formatDateTime(prayer.prayed_at)}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {!hasPrayed && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={actingId === request.id}
                      onClick={() => handleMarkPrayed(request.id)}
                    >
                      {actingId === request.id ? 'Saving…' : "I've prayed for this"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
