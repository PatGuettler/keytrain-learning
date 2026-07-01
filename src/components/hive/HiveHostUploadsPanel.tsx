import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/StatCard'
import { hostUploadSummary, splitHostUploads } from '@/lib/hive-records'
import type { HiveRecord } from '@/types/hive.types'
import { AlertTriangle, Server } from 'lucide-react'

type HiveHostUploadsPanelProps = {
  indicators: HiveRecord[]
  legacyIocCount?: number
}

function HostUploadTable({
  records,
  emptyMessage,
  showLegacyColumns = false,
}: {
  records: HiveRecord[]
  emptyMessage: string
  showLegacyColumns?: boolean
}) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="px-3 py-2 font-medium">Org</th>
            <th className="px-3 py-2 font-medium">Summary</th>
            <th className="px-3 py-2 font-medium">Host</th>
            {showLegacyColumns && (
              <>
                <th className="px-3 py-2 font-medium">Indicator</th>
                <th className="px-3 py-2 font-medium">Severity</th>
              </>
            )}
            <th className="px-3 py-2 font-medium">Sort key</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr key={`${record.pk}-${record.sk}-${index}`} className="border-t">
              <td className="px-3 py-2 whitespace-nowrap">
                <Badge variant="outline">{String(record.hive_org_id ?? '—')}</Badge>
              </td>
              <td className="px-3 py-2 max-w-xs truncate" title={hostUploadSummary(record)}>
                {hostUploadSummary(record)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {record.host_id ? String(record.host_id) : '—'}
              </td>
              {showLegacyColumns && (
                <>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {record.indicator ? String(record.indicator) : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {record.severity ? String(record.severity) : '—'}
                  </td>
                </>
              )}
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-xs truncate">
                {record.sk ? String(record.sk) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function HiveHostUploadsPanel({ indicators, legacyIocCount = 0 }: HiveHostUploadsPanelProps) {
  const { batches, legacyIocs, other } = splitHostUploads(indicators)

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
              <code className="text-xs">KeyTrainHiveIndicators</code>. AWS should migrate these to{' '}
              <code className="text-xs">KeyTrainHiveSignatures</code> and write only{' '}
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
          <HostUploadTable
            records={batches}
            emptyMessage="No BATCH# host uploads yet. KT hosts push monthly batches under ORG#… partition keys."
          />
        </CardContent>
      </Card>

      {legacyIocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legacy IOC rows (TS# — pending AWS migration)</CardTitle>
          </CardHeader>
          <CardContent>
            <HostUploadTable
              records={legacyIocs}
              emptyMessage="No legacy rows."
              showLegacyColumns
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
