import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/StatCard'
import { trainingSummary } from '@/lib/railnet-records'
import type { RailNetRecord } from '@/types/railnet.types'
import { GraduationCap } from 'lucide-react'

type RailNetTrainingPanelProps = {
  trainingAssignments: RailNetRecord[]
}

export function RailNetTrainingPanel({ trainingAssignments }: RailNetTrainingPanelProps) {
  const totalQuestions = trainingAssignments.reduce((sum, record) => {
    if (typeof record.total_question_count === 'number') return sum + record.total_question_count
    if (Array.isArray(record.questions)) return sum + record.questions.length
    return sum
  }, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard title="Assignments" value={trainingAssignments.length} icon={GraduationCap} />
        <StatCard title="Total questions" value={totalQuestions} subtitle="across visible assignments" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly training assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {trainingAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No training assignments for the selected org filter.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Org</th>
                    <th className="px-3 py-2 font-medium">Summary</th>
                    <th className="px-3 py-2 font-medium">Questions</th>
                    <th className="px-3 py-2 font-medium">Trend report</th>
                    <th className="px-3 py-2 font-medium">Sort key</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingAssignments.map((record, index) => (
                    <tr key={`${record.pk}-${record.sk}-${index}`} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge variant="outline">{String(record.railnet_org_id ?? '—')}</Badge>
                      </td>
                      <td className="px-3 py-2 max-w-md truncate" title={trainingSummary(record)}>
                        {trainingSummary(record)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {record.total_question_count != null
                          ? String(record.total_question_count)
                          : Array.isArray(record.questions)
                            ? record.questions.length
                            : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-xs truncate">
                        {record.trend_report_sk ? String(record.trend_report_sk) : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-xs truncate">
                        {record.sk ? String(record.sk) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
