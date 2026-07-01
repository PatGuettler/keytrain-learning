import type { HiveRecord } from '@/types/hive.types'

export type HostUploadKind = 'batch' | 'legacy_ioc' | 'other'

export function classifyHostUpload(record: HiveRecord): HostUploadKind {
  const sk = String(record.sk ?? '')
  if (sk.startsWith('BATCH#')) return 'batch'
  if (sk.startsWith('TS#')) return 'legacy_ioc'
  return 'other'
}

export function getTrendReportingPeriod(record: HiveRecord): string {
  if (typeof record.reporting_period === 'string' && record.reporting_period.trim()) {
    return record.reporting_period.trim()
  }
  const sk = String(record.sk ?? '')
  const match = sk.match(/^TREND#(\d{4}-\d{2})#/)
  return match?.[1] ?? '—'
}

export function getRecordObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

export function getTrendRawMetrics(record: HiveRecord): Record<string, unknown> | null {
  return getRecordObject(record.raw_metrics)
}

export function getAlertCounts(record: HiveRecord): Record<string, number> {
  const metrics = getTrendRawMetrics(record)
  const alertCounts = getRecordObject(metrics?.alert_counts)
  if (!alertCounts) return {}

  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(alertCounts)) {
    if (typeof value === 'number') result[key] = value
  }
  return result
}

export function getRiskScores(record: HiveRecord): Record<string, number> {
  const metrics = getTrendRawMetrics(record)
  const riskScores = getRecordObject(metrics?.risk_scores)
  if (!riskScores) return {}

  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(riskScores)) {
    if (typeof value === 'number') result[key] = value
  }
  return result
}

export function splitHostUploads(records: HiveRecord[]) {
  const batches: HiveRecord[] = []
  const legacyIocs: HiveRecord[] = []
  const other: HiveRecord[] = []

  for (const record of records) {
    const kind = classifyHostUpload(record)
    if (kind === 'batch') batches.push(record)
    else if (kind === 'legacy_ioc') legacyIocs.push(record)
    else other.push(record)
  }

  return { batches, legacyIocs, other }
}

export function countSignaturesByStatus(records: HiveRecord[]) {
  const counts = { approved: 0, pending: 0, other: 0 }
  for (const record of records) {
    const status = String(record.approval_status ?? '').toLowerCase()
    if (status === 'approved') counts.approved += 1
    else if (status === 'pending') counts.pending += 1
    else counts.other += 1
  }
  return counts
}

export function hostUploadSummary(record: HiveRecord): string {
  const hostId = record.host_id ? String(record.host_id) : 'Unknown host'
  const sk = String(record.sk ?? '')
  if (sk.startsWith('BATCH#')) return `${hostId} · batch ${sk.replace('BATCH#', '')}`
  if (record.indicator) return `${hostId} · ${String(record.indicator)}`
  return hostId
}

export function signatureSummary(record: HiveRecord): string {
  return String(record.phrase ?? record.signature_id ?? record.sk ?? '—')
}

export function trainingSummary(record: HiveRecord): string {
  const period = record.reporting_period ?? getTrendReportingPeriod(record)
  const count = record.total_question_count ?? (Array.isArray(record.questions) ? record.questions.length : null)
  const parts = [String(period)]
  if (count != null) parts.push(`${count} questions`)
  if (record.assignment_type) parts.push(String(record.assignment_type))
  return parts.join(' · ')
}

export function trendReportKey(record: HiveRecord): string {
  return `${String(record.pk ?? '')}|${String(record.sk ?? '')}`
}

export function trendReportLabel(record: HiveRecord): string {
  const org = String(record.hive_org_id ?? '—')
  const period = getTrendReportingPeriod(record)
  const sk = String(record.sk ?? '')
  return `${org} · ${period}${sk ? ` · ${sk}` : ''}`
}

export function sortTrendReports(reports: HiveRecord[]): HiveRecord[] {
  return [...reports].sort((a, b) => {
    const byPeriod = getTrendReportingPeriod(b).localeCompare(getTrendReportingPeriod(a))
    if (byPeriod !== 0) return byPeriod
    return String(a.hive_org_id ?? '').localeCompare(String(b.hive_org_id ?? ''))
  })
}

export function getNumericRecordMap(value: unknown): Record<string, number> {
  const obj = getRecordObject(value)
  if (!obj) return {}
  const result: Record<string, number> = {}
  for (const [key, entry] of Object.entries(obj)) {
    if (typeof entry === 'number') result[key] = entry
  }
  return result
}

export function getHostAlertMetrics(record: HiveRecord): Record<string, number> {
  return getNumericRecordMap(record.alert_metrics)
}

export function sumHostAlertMetrics(batches: HiveRecord[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const batch of batches) {
    for (const [key, value] of Object.entries(getHostAlertMetrics(batch))) {
      totals[key] = (totals[key] ?? 0) + value
    }
  }
  return totals
}

export function getBatchesForTrendReport(
  batches: HiveRecord[],
  report: HiveRecord
): HiveRecord[] {
  const orgId = String(report.hive_org_id ?? '')
  const period = getTrendReportingPeriod(report)
  return batches.filter((batch) => {
    if (String(batch.hive_org_id ?? '') !== orgId) return false
    if (classifyHostUpload(batch) !== 'batch') return false
    const batchPeriod =
      typeof batch.reporting_period === 'string' ? batch.reporting_period.trim() : ''
    if (batchPeriod && period !== '—') return batchPeriod === period
    return true
  })
}

export type AlertReconciliationRow = {
  severity: string
  trendReport: number
  hostBatchSum: number
  delta: number
  matches: boolean
}

export function reconcileAlertCounts(
  trendCounts: Record<string, number>,
  hostTotals: Record<string, number>
): AlertReconciliationRow[] {
  const keys = new Set([...Object.keys(trendCounts), ...Object.keys(hostTotals)])
  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .map((severity) => {
      const trendReport = trendCounts[severity] ?? 0
      const hostBatchSum = hostTotals[severity] ?? 0
      return {
        severity,
        trendReport,
        hostBatchSum,
        delta: trendReport - hostBatchSum,
        matches: trendReport === hostBatchSum,
      }
    })
}

export function getDomainCounts(record: HiveRecord): Record<string, number> {
  const metrics = getTrendRawMetrics(record)
  return getNumericRecordMap(metrics?.domain_counts)
}

export function getTrainingSummaryMetrics(record: HiveRecord): Record<string, unknown> | null {
  const metrics = getTrendRawMetrics(record)
  return getRecordObject(metrics?.training_summary)
}

export function getSoftwareFindingsFromTrend(record: HiveRecord): unknown[] {
  const metrics = getTrendRawMetrics(record)
  const findings = metrics?.software_findings
  return Array.isArray(findings) ? findings : []
}

export function getIocSummary(record: HiveRecord): Record<string, unknown> | null {
  const metrics = getTrendRawMetrics(record)
  return getRecordObject(metrics?.ioc_summary)
}

export function alertCountsTotal(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0)
}
