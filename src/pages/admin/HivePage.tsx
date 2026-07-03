import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Hexagon, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/StatCard'
import { ExportPdfButton } from '@/components/dashboard/ExportPdfButton'
import { HiveOrgFilter } from '@/components/hive/HiveOrgFilter'
import { HiveSecurityPosturePanel } from '@/components/hive/HiveSecurityPosturePanel'
import { HiveReportingPanel } from '@/components/hive/HiveReportingPanel'
import { HiveHostUploadsPanel } from '@/components/hive/HiveHostUploadsPanel'
import { HiveTrainingPanel } from '@/components/hive/HiveTrainingPanel'
import { HiveCourseStagingPanel } from '@/components/hive/HiveCourseStagingPanel'
import { HiveCompliancePanel } from '@/components/hive/HiveCompliancePanel'
import { fetchHiveData } from '@/services/hive.service'
import { exportHiveReportPdf } from '@/lib/pdf/hive-reports'
import { useRailnetAccess, useRailnetOrgScope } from '@/hooks/useRailnetAccess'

type HiveView =
  | 'overview'
  | 'security'
  | 'reporting'
  | 'host-uploads'
  | 'training'
  | 'staging'
  | 'compliance'

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
  { id: 'staging', label: 'Course staging' },
  { id: 'compliance', label: 'Compliance' },
]

export function HivePage() {
  const { isPlatformAdmin } = useRailnetAccess()
  const { platformAdmin, hiveOrgId, isConfigured, isLoading: scopeLoading } = useRailnetOrgScope()
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([])
  const [view, setView] = useState<HiveView>('overview')

  const queryOrgIds = useMemo(() => {
    if (platformAdmin) {
      return selectedOrgIds.length > 0 ? selectedOrgIds : undefined
    }
    return hiveOrgId ? [hiveOrgId] : []
  }, [platformAdmin, selectedOrgIds, hiveOrgId])

  const visibleViews = useMemo(
    () =>
      platformAdmin
        ? VIEW_OPTIONS
        : VIEW_OPTIONS.filter((v) => v.id !== 'staging' && v.id !== 'compliance'),
    [platformAdmin]
  )

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['hive-data', queryOrgIds ?? 'all'],
    queryFn: () => fetchHiveData(queryOrgIds),
    enabled: platformAdmin || Boolean(hiveOrgId),
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
        title="RailNet"
        description="Shared intelligence network — host uploads, signatures, trend reports, and training assignments."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportPdfButton
              disabled={!data || isLoading}
              label="Export PDF"
              onExport={() => {
                if (!data) return
                exportHiveReportPdf(data, platformAdmin ? selectedOrgIds : hiveOrgId ? [hiveOrgId] : [])
              }}
            />
            <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh from AWS
            </Button>
          </div>
        }
      />

      {scopeLoading && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Loading organization settings…
          </CardContent>
        </Card>
      )}

      {!scopeLoading && !isConfigured && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            RailNet is not configured for your organization yet. Ask a platform administrator to
            set the AWS org id in organization settings, then enable RailNet on your user profile.
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Could not load RailNet data.'}
          </CardContent>
        </Card>
      )}

      {isLoading && isConfigured && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Loading RailNet data from AWS…
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
            lockedOrgId={platformAdmin ? null : hiveOrgId}
          />

          <div className="flex flex-wrap gap-2">
            {visibleViews.map((option) => (
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

          {view === 'security' && (
            <HiveSecurityPosturePanel
              signatures={data.signatures}
              canManageSignatures={isPlatformAdmin}
            />
          )}
          {view === 'reporting' && (
            <HiveReportingPanel
              trendReports={data.trend_reports}
              hostBatches={data.indicators}
            />
          )}
          {view === 'host-uploads' && (
            <HiveHostUploadsPanel
              indicators={data.indicators}
              legacyIocCount={data.counts.legacy_iocs}
            />
          )}
          {view === 'training' && (
            <HiveTrainingPanel trainingAssignments={data.training_assignments} />
          )}
          {view === 'staging' && platformAdmin && (
            <HiveCourseStagingPanel trainingAssignments={data.training_assignments} />
          )}
          {view === 'compliance' && platformAdmin && (
            <HiveCompliancePanel
              trendReports={data.trend_reports}
              signatures={data.signatures}
            />
          )}
        </>
      )}
    </div>
  )
}
