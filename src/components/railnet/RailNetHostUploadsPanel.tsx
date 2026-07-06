import { useMemo, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/dashboard/StatCard'
import { ConfigurableRailNetTable } from '@/components/railnet/ConfigurableRailNetTable'
import {
  filterAndSortHostBatches,
  formatAlertMetricsSummary,
  formatBatchUploadedAt,
  getBatchReportingPeriod,
  hostUploadSummary,
  splitHostUploads,
  type HostBatchSort,
} from '@/lib/railnet-records'
import type { RailNetRecord } from '@/types/railnet.types'
import { AlertTriangle, Server } from 'lucide-react'

type RailNetHostUploadsPanelProps = {
  indicators: RailNetRecord[]
  legacyIocCount?: number
}

const BATCH_SORT_OPTIONS: { value: HostBatchSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'host', label: 'Host id (A–Z)' },
  { value: 'org', label: 'Org (A–Z)' },
  { value: 'period', label: 'Reporting period' },
]

function renderBatchCell(columnId: string, record: RailNetRecord): ReactNode {
  switch (columnId) {
    case 'org':
      return <Badge variant="outline">{String(record.railnet_org_id ?? '—')}</Badge>
    case 'host':
      return (
        <span
          className="block truncate font-mono text-xs"
          title={String(record.host_id ?? '')}
        >
          {record.host_id ? String(record.host_id) : '—'}
        </span>
      )
    case 'period':
      return getBatchReportingPeriod(record)
    case 'uploaded':
      return (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatBatchUploadedAt(record)}
        </span>
      )
    case 'alerts':
      return (
        <span
          className="block truncate text-muted-foreground"
          title={formatAlertMetricsSummary(record)}
        >
          {formatAlertMetricsSummary(record)}
        </span>
      )
    case 'sort_key':
      return (
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {record.sk ? String(record.sk) : '—'}
        </span>
      )
    default:
      return '—'
  }
}

function renderLegacyCell(columnId: string, record: RailNetRecord): ReactNode {
  switch (columnId) {
    case 'org':
      return <Badge variant="outline">{String(record.railnet_org_id ?? '—')}</Badge>
    case 'summary':
      return (
        <span className="block truncate" title={hostUploadSummary(record)}>
          {hostUploadSummary(record)}
        </span>
      )
    case 'host':
      return (
        <span
          className="block truncate font-mono text-xs"
          title={String(record.host_id ?? '')}
        >
          {record.host_id ? String(record.host_id) : '—'}
        </span>
      )
    case 'indicator':
      return record.indicator ? String(record.indicator) : '—'
    case 'severity':
      return record.severity ? String(record.severity) : '—'
    case 'sort_key':
      return (
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {record.sk ? String(record.sk) : '—'}
        </span>
      )
    default:
      return '—'
  }
}

function BatchUploadToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  shown,
  total,
}: {
  search: string
  onSearchChange: (value: string) => void
  sort: HostBatchSort
  onSortChange: (value: HostBatchSort) => void
  shown: number
  total: number
}) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search host id, org, BATCH#, period…"
            className="pl-9"
            aria-label="Search host batches"
          />
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">Sort</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as HostBatchSort)}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Sort host batches"
          >
            {BATCH_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {shown} of {total} batch{total === 1 ? '' : 'es'}
        {search.trim() ? ` matching “${search.trim()}”` : ''}
        . Try your KT <code className="text-xs">host_id</code> (e.g.{' '}
        <code className="text-xs">host-e0be505f-…</code>) or org{' '}
        <code className="text-xs">KeyTrainAdmins</code>.
      </p>
    </div>
  )
}

export function RailNetHostUploadsPanel({ indicators, legacyIocCount = 0 }: RailNetHostUploadsPanelProps) {
  const { batches, legacyIocs, other } = splitHostUploads(indicators)
  const [batchSearch, setBatchSearch] = useState('')
  const [batchSort, setBatchSort] = useState<HostBatchSort>('newest')

  const filteredBatches = useMemo(
    () => filterAndSortHostBatches(batches, { query: batchSearch, sort: batchSort }),
    [batches, batchSearch, batchSort]
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Monthly batches" value={batches.length} icon={Server} />
        <StatCard title="Legacy IOC rows" value={legacyIocs.length || legacyIocCount} icon={AlertTriangle} />
        <StatCard title="Other rows" value={other.length} />
      </div>

      {legacyIocs.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-6 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Legacy mixed data detected
            </p>
            <p className="mt-1 text-muted-foreground">
              {legacyIocs.length} row(s) use the old <code className="text-xs">TS#…</code> pattern in{' '}
              <code className="text-xs">RailNet indicators</code>. AWS should migrate these to{' '}
              <code className="text-xs">RailNet signatures</code> and write only{' '}
              <code className="text-xs">BATCH#…</code> host uploads going forward (see plan § AWS
              prerequisites).
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly host uploads (BATCH#)</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchUploadToolbar
            search={batchSearch}
            onSearchChange={setBatchSearch}
            sort={batchSort}
            onSortChange={setBatchSort}
            shown={filteredBatches.length}
            total={batches.length}
          />
          <ConfigurableRailNetTable
            viewId="host_uploads_batch"
            rows={filteredBatches}
            rowKey={(record, index) => `${record.pk}-${record.sk}-${index}`}
            renderCell={(columnId, record) => renderBatchCell(columnId, record)}
            emptyMessage={
              batches.length === 0
                ? 'No BATCH# host uploads yet. KT hosts push monthly batches under ORG#… partition keys.'
                : 'No batches match your search. Clear the filter or check the org filter above.'
            }
          />
        </CardContent>
      </Card>

      {legacyIocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legacy IOC rows (TS# — pending AWS migration)</CardTitle>
          </CardHeader>
          <CardContent>
            <ConfigurableRailNetTable
              viewId="host_uploads_legacy"
              rows={legacyIocs}
              rowKey={(record, index) => `${record.pk}-${record.sk}-${index}`}
              renderCell={(columnId, record) => renderLegacyCell(columnId, record)}
              emptyMessage="No legacy rows."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
