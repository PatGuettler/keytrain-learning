import { useEffect, useMemo, useState } from 'react'
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
import { StatCard } from '@/components/dashboard/StatCard'
import {
  alertCountsTotal,
  getAlertCounts,
  getBatchesForTrendReport,
  getDomainCounts,
  getIocSummary,
  getRiskScores,
  getSoftwareFindingsFromTrend,
  getTrainingSummaryMetrics,
  getTrendReportingPeriod,
  reconcileAlertCounts,
  sortTrendReports,
  sumHostAlertMetrics,
  trendReportKey,
  trendReportLabel,
  getHostAlertMetrics,
} from '@/lib/hive-records'
import type { HiveRecord } from '@/types/hive.types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { chartTheme } from '@/lib/chart-theme'
import { CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type HiveReportingPanelProps = {
  trendReports: HiveRecord[]
  hostBatches: HiveRecord[]
}

const ALERT_COLORS: Record<string, string> = {
  Critical: 'hsl(0 72% 51%)',
  High: 'hsl(25 95% 53%)',
  Normal: 'hsl(var(--primary))',
  Suspicious: 'hsl(45 93% 47%)',
}

function AlertCountsChart({
  record,
  onBarClick,
}: {
  record: HiveRecord
  onBarClick?: (severity: string) => void
}) {
  const alertCounts = getAlertCounts(record)
  const total = alertCountsTotal(alertCounts)
  const data = Object.entries(alertCounts).map(([name, value]) => ({
    name,
    value,
    pct: total > 0 ? Math.round((value / total) * 100) : 0,
  }))

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Alert counts · {getTrendReportingPeriod(record)} · total {total}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-56 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={chartTheme.tick} />
            <YAxis tick={chartTheme.tick} allowDecimals={false} />
            <Tooltip
              contentStyle={chartTheme.tooltip}
              formatter={(value: number, _name, item) => {
                const pct = item.payload?.pct ?? 0
                return [`${value} (${pct}% of ${total})`, 'Alerts']
              }}
            />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              cursor={onBarClick ? 'pointer' : undefined}
              onClick={(entry) => onBarClick?.(String(entry.name ?? ''))}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={ALERT_COLORS[entry.name] ?? chartTheme.primary} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">
          Click a bar to highlight that severity in the reconciliation table below.
        </p>
      </CardContent>
    </Card>
  )
}

export function HiveReportingPanel({ trendReports, hostBatches }: HiveReportingPanelProps) {
  const sortedReports = useMemo(() => sortTrendReports(trendReports), [trendReports])
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [highlightSeverity, setHighlightSeverity] = useState<string | null>(null)
  const [rawDialogOpen, setRawDialogOpen] = useState(false)

  useEffect(() => {
    if (sortedReports.length === 0) {
      setSelectedKey('')
      return
    }
    const stillValid = sortedReports.some((r) => trendReportKey(r) === selectedKey)
    if (!selectedKey || !stillValid) {
      setSelectedKey(trendReportKey(sortedReports[0]))
    }
  }, [sortedReports, selectedKey])

  const selectedReport = sortedReports.find((r) => trendReportKey(r) === selectedKey)
  const relatedBatches = selectedReport
    ? getBatchesForTrendReport(hostBatches, selectedReport)
    : []
  const trendAlerts = selectedReport ? getAlertCounts(selectedReport) : {}
  const hostAlertTotals = sumHostAlertMetrics(relatedBatches)
  const reconciliation = reconcileAlertCounts(trendAlerts, hostAlertTotals)
  const riskScores = selectedReport ? getRiskScores(selectedReport) : {}
  const domainCounts = selectedReport ? getDomainCounts(selectedReport) : {}
  const trainingSummary = selectedReport ? getTrainingSummaryMetrics(selectedReport) : null
  const softwareFindings = selectedReport ? getSoftwareFindingsFromTrend(selectedReport) : []
  const iocSummary = selectedReport ? getIocSummary(selectedReport) : null
  const allReconciled =
    reconciliation.length > 0 && reconciliation.every((row) => row.matches)
  const hasHostData = relatedBatches.length > 0

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Trend reports" value={sortedReports.length} icon={TrendingUp} />
        {selectedReport &&
          Object.entries(riskScores).map(([key, value]) => (
            <StatCard
              key={key}
              title={`Risk: ${key.replace(/_/g, ' ')}`}
              value={value}
              subtitle={`${String(selectedReport.hive_org_id)} · ${getTrendReportingPeriod(selectedReport)}`}
            />
          ))}
      </div>

      {sortedReports.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No trend reports for the selected org filter. Monthly AI reports appear in{' '}
            <code className="text-xs">KeyTrainHiveTrendReports</code>.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select trend report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-sm text-muted-foreground">
                Choose which org/period to inspect — charts and drill-down use this report only.
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedKey}
                onChange={(e) => {
                  setSelectedKey(e.target.value)
                  setHighlightSeverity(null)
                }}
              >
                {sortedReports.map((record) => (
                  <option key={trendReportKey(record)} value={trendReportKey(record)}>
                    {trendReportLabel(record)}
                  </option>
                ))}
              </select>
              {selectedReport && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{String(selectedReport.hive_org_id ?? '—')}</Badge>
                  <span>Period {getTrendReportingPeriod(selectedReport)}</span>
                  <span className="font-mono truncate max-w-full">{String(selectedReport.sk ?? '')}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setRawDialogOpen(true)}
                  >
                    View raw JSON
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedReport && (
            <>
              <AlertCountsChart
                record={selectedReport}
                onBarClick={(severity) =>
                  setHighlightSeverity((current) => (current === severity ? null : severity))
                }
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    Alert count provenance
                    {hasHostData && allReconciled && (
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Matches host batch sums
                      </span>
                    )}
                    {hasHostData && !allReconciled && (
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Differs from host batch sums
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    The trend report stores aggregated <code className="text-xs">raw_metrics.alert_counts</code>.
                    {hasHostData
                      ? ' Compare against the sum of per-host BATCH# uploads for the same org and period.'
                      : ' No BATCH# host uploads found for this org/period — upload data to reconcile.'}
                  </p>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-medium">Severity</th>
                          <th className="px-3 py-2 font-medium">Trend report</th>
                          <th className="px-3 py-2 font-medium">Host batches Σ</th>
                          <th className="px-3 py-2 font-medium">Delta</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reconciliation.map((row) => (
                          <tr
                            key={row.severity}
                            className={cn(
                              'border-t',
                              highlightSeverity === row.severity && 'bg-primary/10'
                            )}
                          >
                            <td className="px-3 py-2 font-medium">{row.severity}</td>
                            <td className="px-3 py-2">{row.trendReport}</td>
                            <td className="px-3 py-2">{hasHostData ? row.hostBatchSum : '—'}</td>
                            <td className="px-3 py-2">
                              {hasHostData ? (row.delta === 0 ? '0' : row.delta > 0 ? `+${row.delta}` : row.delta) : '—'}
                            </td>
                            <td className="px-3 py-2">
                              {!hasHostData ? (
                                <span className="text-muted-foreground">No host data</span>
                              ) : row.matches ? (
                                <span className="text-emerald-600">Match</span>
                              ) : (
                                <span className="text-amber-600">Mismatch</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reconciliation.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      This trend report has no <code className="text-xs">alert_counts</code> in{' '}
                      <code className="text-xs">raw_metrics</code>.
                    </p>
                  )}
                </CardContent>
              </Card>

              {hasHostData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Host drill-down ({relatedBatches.length} batch
                      {relatedBatches.length === 1 ? '' : 'es'})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr className="text-left">
                            <th className="px-3 py-2 font-medium">Host</th>
                            <th className="px-3 py-2 font-medium">Profile</th>
                            <th className="px-3 py-2 font-medium">Critical</th>
                            <th className="px-3 py-2 font-medium">High</th>
                            <th className="px-3 py-2 font-medium">Normal</th>
                            <th className="px-3 py-2 font-medium">Suspicious</th>
                            <th className="px-3 py-2 font-medium">Batch sk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {relatedBatches.map((batch, index) => {
                            const alerts = getHostAlertMetrics(batch)
                            return (
                              <tr key={`${batch.pk}-${batch.sk}-${index}`} className="border-t">
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {batch.host_id ? String(batch.host_id) : '—'}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {batch.host_profile ? String(batch.host_profile) : '—'}
                                </td>
                                <td
                                  className={cn(
                                    'px-3 py-2',
                                    highlightSeverity === 'Critical' && 'bg-primary/10 font-medium'
                                  )}
                                >
                                  {alerts.Critical ?? 0}
                                </td>
                                <td
                                  className={cn(
                                    'px-3 py-2',
                                    highlightSeverity === 'High' && 'bg-primary/10 font-medium'
                                  )}
                                >
                                  {alerts.High ?? 0}
                                </td>
                                <td
                                  className={cn(
                                    'px-3 py-2',
                                    highlightSeverity === 'Normal' && 'bg-primary/10 font-medium'
                                  )}
                                >
                                  {alerts.Normal ?? 0}
                                </td>
                                <td
                                  className={cn(
                                    'px-3 py-2',
                                    highlightSeverity === 'Suspicious' && 'bg-primary/10 font-medium'
                                  )}
                                >
                                  {alerts.Suspicious ?? 0}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-xs truncate">
                                  {batch.sk ? String(batch.sk) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="bg-muted/30 border-t font-medium">
                          <tr>
                            <td className="px-3 py-2" colSpan={2}>
                              Sum (host batches)
                            </td>
                            <td className="px-3 py-2">{hostAlertTotals.Critical ?? 0}</td>
                            <td className="px-3 py-2">{hostAlertTotals.High ?? 0}</td>
                            <td className="px-3 py-2">{hostAlertTotals.Normal ?? 0}</td>
                            <td className="px-3 py-2">{hostAlertTotals.Suspicious ?? 0}</td>
                            <td className="px-3 py-2" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {Object.keys(domainCounts).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Domain alert volume</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr className="text-left">
                            <th className="px-3 py-2 font-medium">Domain</th>
                            <th className="px-3 py-2 font-medium">Alerts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(domainCounts)
                            .sort(([, a], [, b]) => b - a)
                            .map(([domain, count]) => (
                              <tr key={domain} className="border-t">
                                <td className="px-3 py-2">{domain}</td>
                                <td className="px-3 py-2">{count}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(trainingSummary || softwareFindings.length > 0 || iocSummary) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Additional metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {trainingSummary && (
                      <div>
                        <p className="font-medium mb-1">Training summary</p>
                        <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
                          {JSON.stringify(trainingSummary, null, 2)}
                        </pre>
                      </div>
                    )}
                    {iocSummary && (
                      <div>
                        <p className="font-medium mb-1">IOC summary</p>
                        <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">
                          {JSON.stringify(iocSummary, null, 2)}
                        </pre>
                      </div>
                    )}
                    {softwareFindings.length > 0 && (
                      <div>
                        <p className="font-medium mb-1">
                          Software findings ({softwareFindings.length})
                        </p>
                        <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto max-h-48">
                          {JSON.stringify(softwareFindings, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All trend reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Org</th>
                      <th className="px-3 py-2 font-medium">Period</th>
                      <th className="px-3 py-2 font-medium">Alert total</th>
                      <th className="px-3 py-2 font-medium">Has metrics</th>
                      <th className="px-3 py-2 font-medium">Sort key</th>
                      <th className="px-3 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReports.map((record, index) => {
                      const key = trendReportKey(record)
                      const total = alertCountsTotal(getAlertCounts(record))
                      return (
                        <tr
                          key={`${record.pk}-${record.sk}-${index}`}
                          className={cn('border-t', key === selectedKey && 'bg-primary/5')}
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <Badge variant="outline">{String(record.hive_org_id ?? '—')}</Badge>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {getTrendReportingPeriod(record)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{total || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {record.raw_metrics ? 'Yes' : 'No'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-xs truncate">
                            {record.sk ? String(record.sk) : '—'}
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={key === selectedKey ? 'default' : 'outline'}
                              onClick={() => setSelectedKey(key)}
                            >
                              Inspect
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={rawDialogOpen} onOpenChange={setRawDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Raw trend report</DialogTitle>
                <DialogDescription>
                  {selectedReport ? trendReportLabel(selectedReport) : ''}
                </DialogDescription>
              </DialogHeader>
              <pre className="rounded-md bg-muted p-3 text-xs overflow-auto max-h-[60vh]">
                {selectedReport ? JSON.stringify(selectedReport, null, 2) : '{}'}
              </pre>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
