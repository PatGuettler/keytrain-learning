import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Hexagon, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fetchHiveData } from '@/services/hive.service'
import type { HiveRecord } from '@/types/hive.types'

type HiveSection = 'indicators' | 'trends' | 'training' | 'signatures'

function formatFetchedAt(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

function recordSummary(record: HiveRecord): string {
  const indicator = record.indicator ?? record.phrase ?? record.sk
  const type = record.indicator_type ?? record.signature_type ?? record.domain
  const parts = [String(indicator ?? '—')]
  if (type) parts.push(`(${String(type)})`)
  return parts.join(' ')
}

function HiveDataTable({
  records,
  emptyMessage,
}: {
  records: HiveRecord[]
  emptyMessage: string
}) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="px-3 py-2 font-medium">Org</th>
            <th className="px-3 py-2 font-medium">Summary</th>
            <th className="px-3 py-2 font-medium">Severity</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Sort key</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr key={`${record.pk}-${record.sk}-${index}`} className="border-t">
              <td className="px-3 py-2 whitespace-nowrap">
                <Badge variant="outline">{String(record.hive_org_id ?? '—')}</Badge>
              </td>
              <td className="px-3 py-2 max-w-md truncate" title={recordSummary(record)}>
                {recordSummary(record)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {record.severity ? String(record.severity) : '—'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {record.approval_status ? String(record.approval_status) : '—'}
              </td>
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

export function HivePage() {
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([])
  const [section, setSection] = useState<HiveSection>('indicators')

  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['hive-data', selectedOrgIds],
    queryFn: () => fetchHiveData(selectedOrgIds.length > 0 ? selectedOrgIds : undefined),
    staleTime: 30_000,
  })

  const availableOrgIds = data?.org_ids ?? []

  const toggleOrg = (orgId: string) => {
    setSelectedOrgIds((current) =>
      current.includes(orgId)
        ? current.filter((id) => id !== orgId)
        : [...current, orgId]
    )
  }

  const summaryCards = useMemo(
    () => [
      { label: 'Indicators', value: data?.counts.indicators ?? 0 },
      { label: 'Trend reports', value: data?.counts.trend_reports ?? 0 },
      { label: 'Training assignments', value: data?.counts.training_assignments ?? 0 },
      { label: 'Signatures', value: data?.counts.signatures ?? 0 },
    ],
    [data]
  )

  const sectionRecords = useMemo(() => {
    if (!data) return []
    switch (section) {
      case 'indicators':
        return data.indicators
      case 'trends':
        return data.trend_reports
      case 'training':
        return data.training_assignments
      case 'signatures':
        return data.signatures
    }
  }, [data, section])

  const sectionEmptyMessage = useMemo(() => {
    switch (section) {
      case 'indicators':
        return 'No indicators for the selected org filter.'
      case 'trends':
        return 'No trend reports for the selected org filter.'
      case 'training':
        return 'No training assignments for the selected org filter.'
      case 'signatures':
        return 'No signatures for the selected org filter.'
    }
  }, [section])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hive"
        description="AWS-backed security indicators, trend reports, training assignments, and signatures."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh from AWS
          </Button>
        }
      />

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Could not load Hive data.'}
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Loading Hive data from AWS…
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Hexagon className="h-4 w-4" />
            <span>
              Region {data.region} · Last fetched {formatFetchedAt(data.fetched_at)}
            </span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filter by org</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableOrgIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Hive orgs found in AWS yet. KT hosts push data under partition keys like{' '}
                  <code className="text-xs">ORG#church001</code>.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableOrgIds.map((orgId) => {
                    const active = selectedOrgIds.includes(orgId)
                    return (
                      <Button
                        key={orgId}
                        type="button"
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        onClick={() => toggleOrg(orgId)}
                      >
                        {orgId}
                      </Button>
                    )
                  })}
                  {selectedOrgIds.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedOrgIds([])}
                    >
                      Clear filter
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                v1: all platform admins see all AWS orgs. Select one or more orgs to narrow the
                tables below.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['indicators', `Indicators (${data.counts.indicators})`],
                  ['trends', `Trend reports (${data.counts.trend_reports})`],
                  ['training', `Training (${data.counts.training_assignments})`],
                  ['signatures', `Signatures (${data.counts.signatures})`],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={section === value ? 'default' : 'outline'}
                  onClick={() => setSection(value)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <HiveDataTable records={sectionRecords} emptyMessage={sectionEmptyMessage} />
          </div>
        </>
      )}
    </div>
  )
}
