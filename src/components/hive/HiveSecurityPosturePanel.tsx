import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/StatCard'
import {
  countSignaturesByStatus,
  isPendingSignature,
  signatureSummary,
} from '@/lib/hive-records'
import { approveSignature, rejectSignature } from '@/services/hive.service'
import type { HiveRecord } from '@/types/hive.types'
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'

type HiveSecurityPosturePanelProps = {
  signatures: HiveRecord[]
}

function signatureRowKey(record: HiveRecord, index: number): string {
  return `${record.pk ?? ''}|${record.sk ?? ''}|${index}`
}

export function HiveSecurityPosturePanel({ signatures }: HiveSecurityPosturePanelProps) {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState('')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const statusCounts = countSignaturesByStatus(signatures)

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
        <StatCard title="Approved" value={statusCounts.approved} icon={ShieldCheck} />
        <StatCard title="Pending" value={statusCounts.pending} icon={ShieldAlert} />
        <StatCard title="Other" value={statusCounts.other} icon={ShieldQuestion} />
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
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {signatures.map((record, index) => {
                    const pending = isPendingSignature(record)
                    const busy = isRowBusy(record)
                    const pk = String(record.pk ?? '')
                    const sk = String(record.sk ?? '')

                    return (
                      <tr key={signatureRowKey(record, index)} className="border-t">
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
