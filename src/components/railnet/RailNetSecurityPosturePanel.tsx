import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Eye, Search, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/dashboard/StatCard'
import { ConfigurableRailNetTable } from '@/components/railnet/ConfigurableRailNetTable'
import {
  countSignaturesByStatus,
  filterAndSortSignatures,
  formatSignatureApprovedAt,
  getSignatureApprovedBy,
  getSignatureRuleId,
  getSignatureStatus,
  isPendingSignature,
  signatureSummary,
  type SignatureSort,
  type SignatureStatusFilter,
} from '@/lib/railnet-records'
import { approveSignature, rejectSignature } from '@/services/railnet-data.service'
import type { RailNetRecord } from '@/types/railnet.types'
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'

type RailNetSecurityPosturePanelProps = {
  signatures: RailNetRecord[]
  canManageSignatures?: boolean
}

const STATUS_FILTER_OPTIONS: { value: SignatureStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'approved', label: 'Approved only' },
  { value: 'pending', label: 'Pending only' },
  { value: 'rejected', label: 'Rejected only' },
  { value: 'other', label: 'Other' },
]

const SIGNATURE_SORT_OPTIONS: { value: SignatureSort; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'approved_newest', label: 'Recently approved' },
  { value: 'org', label: 'Org (A–Z)' },
  { value: 'phrase', label: 'Phrase (A–Z)' },
  { value: 'rule_id', label: 'Rule id (A–Z)' },
]

function signatureRowKey(record: RailNetRecord, index: number): string {
  return `${record.pk ?? ''}|${record.sk ?? ''}|${index}`
}

function statusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'approved') return 'default'
  if (status === 'pending') return 'secondary'
  if (status === 'rejected') return 'destructive'
  return 'outline'
}

export function RailNetSecurityPosturePanel({
  signatures,
  canManageSignatures = false,
}: RailNetSecurityPosturePanelProps) {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState('')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SignatureStatusFilter>('all')
  const [sort, setSort] = useState<SignatureSort>('status')
  const [viewRecord, setViewRecord] = useState<RailNetRecord | null>(null)

  const statusCounts = countSignaturesByStatus(signatures)

  const filteredSignatures = useMemo(
    () => filterAndSortSignatures(signatures, { query: search, status: statusFilter, sort }),
    [signatures, search, statusFilter, sort]
  )

  const invalidateRailNet = () => queryClient.invalidateQueries({ queryKey: ['railnet-data'] })

  const approveMutation = useMutation({
    mutationFn: ({ pk, sk }: { pk: string; sk: string }) => approveSignature(pk, sk),
    onMutate: ({ pk, sk }) => setPendingKey(`${pk}|${sk}`),
    onSuccess: () => {
      setActionError('')
      void invalidateRailNet()
    },
    onError: (e: Error) => setActionError(e.message),
    onSettled: () => setPendingKey(null),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ pk, sk }: { pk: string; sk: string }) => rejectSignature(pk, sk),
    onMutate: ({ pk, sk }) => setPendingKey(`${pk}|${sk}`),
    onSuccess: () => {
      setActionError('')
      void invalidateRailNet()
    },
    onError: (e: Error) => setActionError(e.message),
    onSettled: () => setPendingKey(null),
  })

  const isRowBusy = (record: RailNetRecord) =>
    pendingKey === `${String(record.pk ?? '')}|${String(record.sk ?? '')}`

  const renderSignatureCell = (columnId: string, record: RailNetRecord) => {
    const pk = String(record.pk ?? '')
    const sk = String(record.sk ?? '')
    const status = getSignatureStatus(record)
    const pending = isPendingSignature(record)
    const busy = isRowBusy(record)

    switch (columnId) {
      case 'org':
        return <Badge variant="outline">{String(record.railnet_org_id ?? '—')}</Badge>
      case 'rule_id':
        return (
          <span className="block truncate font-mono text-xs" title={getSignatureRuleId(record)}>
            {getSignatureRuleId(record)}
          </span>
        )
      case 'phrase':
        return (
          <span className="block truncate" title={signatureSummary(record)}>
            {signatureSummary(record)}
          </span>
        )
      case 'domain':
        return record.domain ? String(record.domain) : '—'
      case 'type':
        return record.signature_type ? String(record.signature_type) : '—'
      case 'status':
        return <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
      case 'approved_by':
        return (
          <span className="block truncate text-muted-foreground" title={getSignatureApprovedBy(record)}>
            {getSignatureApprovedBy(record)}
          </span>
        )
      case 'approved_at':
        return (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatSignatureApprovedAt(record)}
          </span>
        )
      case 'severity':
        return record.severity ? String(record.severity) : '—'
      case 'sort_key':
        return (
          <span className="block truncate font-mono text-xs text-muted-foreground" title={sk}>
            {sk || '—'}
          </span>
        )
      case 'actions':
        return (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setViewRecord(record)}
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              View
            </Button>
            {canManageSignatures && pending && pk && sk && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => approveMutation.mutate({ pk, sk })}
                >
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => rejectMutation.mutate({ pk, sk })}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Reject
                </Button>
              </>
            )}
          </div>
        )
      default:
        return '—'
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          title="Approved"
          value={statusCounts.approved}
          icon={ShieldCheck}
          onClick={() => setStatusFilter('approved')}
        />
        <StatCard
          title="Pending"
          value={statusCounts.pending}
          icon={ShieldAlert}
          onClick={() => setStatusFilter('pending')}
        />
        <StatCard
          title="Other"
          value={statusCounts.other}
          icon={ShieldQuestion}
          onClick={() => setStatusFilter('other')}
        />
      </div>

      {actionError && (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detection signatures</CardTitle>
        </CardHeader>
        <CardContent>
          {signatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No signatures in AWS for the selected org filter. Approved rules and candidates live
              in <code className="text-xs">RailNet signatures</code>.
            </p>
          ) : (
            <>
              <div className="mb-4 space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search phrase, rule id, SIG#, approved_by, org…"
                      className="pl-9"
                      aria-label="Search signatures"
                    />
                  </div>
                  <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                    <span className="whitespace-nowrap">Status</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as SignatureStatusFilter)}
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Filter by approval status"
                    >
                      {STATUS_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                    <span className="whitespace-nowrap">Sort</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SignatureSort)}
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Sort signatures"
                    >
                      {SIGNATURE_SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Showing {filteredSignatures.length} of {signatures.length} signature
                  {signatures.length === 1 ? '' : 's'}
                  {statusFilter !== 'all' ? ` · status: ${statusFilter}` : ''}
                  {search.trim() ? ` · search: “${search.trim()}”` : ''}. After approve, click{' '}
                  <strong>Refresh Data</strong> and filter <strong>Approved</strong> — check{' '}
                  <strong>Approved by</strong> matches your email (same as DynamoDB{' '}
                  <code className="text-xs">approved_by</code>).
                </p>
              </div>

              <ConfigurableRailNetTable
                viewId="security_posture"
                rows={filteredSignatures}
                rowKey={(record, index) => signatureRowKey(record, index)}
                renderCell={(columnId, record) => renderSignatureCell(columnId, record)}
                emptyMessage="No signatures match your filters. Clear search or set status to “All statuses”."
              />
            </>
          )}
        </CardContent>
      </Card>

      <SignatureDetailsDialog record={viewRecord} onClose={() => setViewRecord(null)} />
    </div>
  )
}

/** Hidden/technical fields we don't need to surface in the details view. */
const HIDDEN_SIGNATURE_FIELDS = new Set(['railnet_org_id'])

function SignatureDetailsDialog({
  record,
  onClose,
}: {
  record: RailNetRecord | null
  onClose: () => void
}) {
  const entries = useMemo(() => {
    if (!record) return []
    return Object.entries(record)
      .filter(([key, value]) => !HIDDEN_SIGNATURE_FIELDS.has(key) && typeof value !== 'function')
      .sort(([a], [b]) => a.localeCompare(b))
  }, [record])

  const formatValue = (value: unknown): string => {
    if (value == null) return '—'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signature detail</DialogTitle>
          <DialogDescription>
            {record ? signatureSummary(record) : ''}
          </DialogDescription>
        </DialogHeader>
        {record && (
          <div className="space-y-4">
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[10rem_1fr] text-sm">
              {entries.map(([key, value]) => (
                <div key={key} className="sm:contents">
                  <dt className="font-medium text-muted-foreground break-words">{key}</dt>
                  <dd className="break-words whitespace-pre-wrap font-mono text-xs sm:text-sm">
                    {formatValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
            <details className="rounded-md border bg-muted/30 p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Raw JSON
              </summary>
              <pre className="mt-2 overflow-x-auto text-xs">
                {JSON.stringify(record, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
