import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/StatCard'
import { countSignaturesByStatus, signatureSummary } from '@/lib/hive-records'
import type { HiveRecord } from '@/types/hive.types'
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'

type HiveSecurityPosturePanelProps = {
  signatures: HiveRecord[]
}

export function HiveSecurityPosturePanel({ signatures }: HiveSecurityPosturePanelProps) {
  const statusCounts = countSignaturesByStatus(signatures)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Approved" value={statusCounts.approved} icon={ShieldCheck} />
        <StatCard title="Pending" value={statusCounts.pending} icon={ShieldAlert} />
        <StatCard title="Other" value={statusCounts.other} icon={ShieldQuestion} />
      </div>

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
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Org</th>
                    <th className="px-3 py-2 font-medium">Phrase / rule</th>
                    <th className="px-3 py-2 font-medium">Domain</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {signatures.map((record, index) => (
                    <tr key={`${record.pk}-${record.sk}-${index}`} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge variant="outline">{String(record.hive_org_id ?? '—')}</Badge>
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
                        {record.approval_status ? String(record.approval_status) : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {record.severity ? String(record.severity) : '—'}
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
