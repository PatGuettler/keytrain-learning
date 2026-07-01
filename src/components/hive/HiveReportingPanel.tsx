import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/StatCard'
import { getAlertCounts, getRiskScores, getTrendReportingPeriod } from '@/lib/hive-records'
import type { HiveRecord } from '@/types/hive.types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { chartTheme } from '@/lib/chart-theme'
import { TrendingUp } from 'lucide-react'

type HiveReportingPanelProps = {
  trendReports: HiveRecord[]
}

function AlertCountsChart({ record }: { record: HiveRecord }) {
  const alertCounts = getAlertCounts(record)
  const data = Object.entries(alertCounts).map(([name, value]) => ({ name, value }))

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Alert counts · {getTrendReportingPeriod(record)}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-52 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={chartTheme.tick} />
            <YAxis tick={chartTheme.tick} />
            <Tooltip contentStyle={chartTheme.tooltip} />
            <Bar dataKey="value" fill={chartTheme.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function HiveReportingPanel({ trendReports }: HiveReportingPanelProps) {
  const latestReport = trendReports[0]
  const riskScores = latestReport ? getRiskScores(latestReport) : {}

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Trend reports" value={trendReports.length} icon={TrendingUp} />
        {Object.entries(riskScores).map(([key, value]) => (
          <StatCard
            key={key}
            title={`Risk: ${key.replace(/_/g, ' ')}`}
            value={value}
            subtitle={latestReport ? getTrendReportingPeriod(latestReport) : undefined}
          />
        ))}
      </div>

      {trendReports.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No trend reports for the selected org filter. Monthly AI reports appear in{' '}
            <code className="text-xs">KeyTrainHiveTrendReports</code>.
          </CardContent>
        </Card>
      ) : (
        <>
          {latestReport && <AlertCountsChart record={latestReport} />}

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
                      <th className="px-3 py-2 font-medium">Has metrics</th>
                      <th className="px-3 py-2 font-medium">Sort key</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendReports.map((record, index) => (
                      <tr key={`${record.pk}-${record.sk}-${index}`} className="border-t">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Badge variant="outline">{String(record.hive_org_id ?? '—')}</Badge>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {getTrendReportingPeriod(record)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {record.raw_metrics ? 'Yes' : 'No'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-xs truncate">
                          {record.sk ? String(record.sk) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
