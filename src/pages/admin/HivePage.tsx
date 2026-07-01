import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Hexagon, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/StatCard'
import { HiveOrgFilter } from '@/components/hive/HiveOrgFilter'
import { HiveSecurityPosturePanel } from '@/components/hive/HiveSecurityPosturePanel'
import { HiveReportingPanel } from '@/components/hive/HiveReportingPanel'
import { HiveHostUploadsPanel } from '@/components/hive/HiveHostUploadsPanel'
import { HiveTrainingPanel } from '@/components/hive/HiveTrainingPanel'
import { fetchHiveData } from '@/services/hive.service'

type HiveView = 'overview' | 'security' | 'reporting' | 'host-uploads' | 'training'

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

const VIEW_OPTIONS: { id: HiveView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'security', label: 'Security Posture' },
  { id: 'reporting', label: 'Reporting' },
  { id: 'host-uploads', label: 'Host uploads' },
  { id: 'training', label: 'Training' },
]

export function HivePage() {
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([])
  const [view, setView] = useState<HiveView>('overview')

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['hive-data', selectedOrgIds],
    queryFn: () => fetchHiveData(selectedOrgIds.length > 0 ? selectedOrgIds : undefined),
    staleTime: 30_000,
  })

  const toggleOrg = (orgId: string) => {
    setSelectedOrgIds((current) =>
      current.includes(orgId) ? current.filter((id) => id !== orgId) : [...current, orgId]
    )
  }

  const summaryCards = useMemo(() => {
    if (!data) return []
    return [
      { label: 'Host batches', value: data.counts.host_batches ?? 0, view: 'host-uploads' as const },
      { label: 'Signatures', value: data.counts.signatures, view: 'security' as const },
      { label: 'Trend reports', value: data.counts.trend_reports, view: 'reporting' as const },
      {
        label: 'Training assignments',
        value: data.counts.training_assignments,
        view: 'training' as const,
      },
    ]
  }, [data])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hive"
        description="AWS-backed host uploads, signatures, trend reports, and training assignments."
        action={
          <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
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

          <HiveOrgFilter
            orgIds={data.org_ids}
            selectedOrgIds={selectedOrgIds}
            onToggleOrg={toggleOrg}
            onClear={() => setSelectedOrgIds([])}
          />

          <div className="flex flex-wrap gap-2">
            {VIEW_OPTIONS.map((option) => (
              <Button
                key={option.id}
                type="button"
                size="sm"
                variant={view === option.id ? 'default' : 'outline'}
                onClick={() => setView(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {view === 'overview' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                  <StatCard
                    key={card.label}
                    title={card.label}
                    value={card.value}
                    onClick={() => setView(card.view)}
                  />
                ))}
              </div>
              {(data.counts.legacy_iocs ?? 0) > 0 && (
                <Card className="border-amber-500/40 bg-amber-500/5">
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    {data.counts.legacy_iocs} legacy IOC row(s) in Indicators — see Host uploads
                    for migration status.
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {view === 'security' && <HiveSecurityPosturePanel signatures={data.signatures} />}
          {view === 'reporting' && <HiveReportingPanel trendReports={data.trend_reports} />}
          {view === 'host-uploads' && (
            <HiveHostUploadsPanel
              indicators={data.indicators}
              legacyIocCount={data.counts.legacy_iocs}
            />
          )}
          {view === 'training' && (
            <HiveTrainingPanel trainingAssignments={data.training_assignments} />
          )}
        </>
      )}
    </div>
  )
}
