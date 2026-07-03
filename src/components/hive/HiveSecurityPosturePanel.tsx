import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Search, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/dashboard/StatCard'
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
} from '@/lib/hive-records'
import { approveSignature, rejectSignature } from '@/services/hive.service'
import type { HiveRecord } from '@/types/hive.types'
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'

type HiveSecurityPosturePanelProps = {
  signatures: HiveRecord[]
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

function signatureRowKey(record: HiveRecord, index: number): string {
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

export function HiveSecurityPosturePanel({
  signatures,
  canManageSignatures = false,
}: HiveSecurityPosturePanelProps) {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState('')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SignatureStatusFilter>('all')
  const [sort, setSort] = useState<SignatureSort>('status')

  const statusCounts = countSignaturesByStatus(signatures)

  const filteredSignatures = useMemo(
    () => filterAndSortSignatures(signatures, { query: search, status: statusFilter, sort }),
    [signatures, search, statusFilter, sort]
  )

  const invalidateHive = () => queryClient.invalidateQueries({ queryKey: ['hive-data'] })

  const approveMutation = useMutation({
    mutationFn: ({ pk, sk }: { pk: string; sk: string }) => approveSignature(pk, sk),
    onMutate: ({ pk, sk }) => setPendingKey(`${pk}|${sk}`),
    onSuccess: () => {
      setActionError('')
      void invalidateHive()
    },
    onError: (e: Error) => setActionError(e.message),
    onSettled: () => setPendingKey(null),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ pk, sk }: { pk: string; sk: string }) => rejectSignature(pk, sk),
    onMutate: ({ pk, sk }) => setPendingKey(`${pk}|${sk}`),
    onSuccess: () => {
      setActionError('')
      void invalidateHive()
    },
    onError: (e: Error) => setActionError(e.message),
    onSettled: () => setPendingKey(null),
  })

  const isRowBusy = (record: HiveRecord) =>
    pendingKey === `${String(record.pk ?? '')}|${String(record.sk ?? '')}`

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
              in <code className="text-xs">KeyTrainHiveSignatures</code>.
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

              {filteredSignatures.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No signatures match your filters. Clear search or set status to “All statuses”.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-medium">Org</th>
                        <th className="px-3 py-2 font-medium">Rule id</th>
                        <th className="px-3 py-2 font-medium">Phrase / rule</th>
                        <th className="px-3 py-2 font-medium">Domain</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Approved by</th>
                        <th className="px-3 py-2 font-medium">Approved at</th>
                        <th className="px-3 py-2 font-medium">Severity</th>
                        <th className="px-3 py-2 font-medium">Sort key</th>
                        {canManageSignatures && (
                          <th className="px-3 py-2 font-medium">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSignatures.map((record, index) => {
                        const pending = isPendingSignature(record)
                        const busy = isRowBusy(record)
                        const pk = String(record.pk ?? '')
                        const sk = String(record.sk ?? '')
                        const status = getSignatureStatus(record)
                        const approvedBy = getSignatureApprovedBy(record)
                        const approvedAt = formatSignatureApprovedAt(record)

                        return (
                          <tr key={signatureRowKey(record, index)} className="border-t">
                            <td className="px-3 py-2 whitespace-nowrap">
                              <Badge variant="outline">{String(record.hive_org_id ?? '—')}</Badge>
                            </td>
                            <td
                              className="px-3 py-2 font-mono text-xs whitespace-nowrap"
                              title={getSignatureRuleId(record)}
                            >
                              {getSignatureRuleId(record)}
                            </td>
                            <td className="px-3 py-2 max-w-xs truncate" title={signatureSummary(record)}>
                              {signatureSummary(record)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {record.domain ? String(record.domain) : '—'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {record.signature_type ? String(record.signature_type) : '—'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
                            </td>
                            <td
                              className="px-3 py-2 max-w-[10rem] truncate text-muted-foreground"
                              title={approvedBy}
                            >
                              {approvedBy}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                              {approvedAt}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {record.severity ? String(record.severity) : '—'}
                            </td>
                            <td
                              className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-[8rem] truncate"
                              title={sk}
                            >
                              {sk || '—'}
                            </td>
                            {canManageSignatures && (
                              <td className="px-3 py-2 whitespace-nowrap">
                                {pending && pk && sk ? (
                                  <div className="flex flex-wrap gap-1">
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
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
