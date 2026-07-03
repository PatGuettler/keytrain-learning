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

export function isPendingSignature(record: HiveRecord): boolean {
  return String(record.approval_status ?? '').toLowerCase() === 'pending'
}

export function hostUploadSummary(record: HiveRecord): string {
  const hostId = record.host_id ? String(record.host_id) : 'Unknown host'
  const sk = String(record.sk ?? '')
  if (sk.startsWith('BATCH#')) return `${hostId} · batch ${sk.replace('BATCH#', '')}`
  if (record.indicator) return `${hostId} · ${String(record.indicator)}`
  return hostId
}

export type HostBatchSort = 'newest' | 'oldest' | 'org' | 'host' | 'period'

export function getBatchEpoch(record: HiveRecord): number {
  const sk = String(record.sk ?? '')
  const match = sk.match(/^BATCH#(\d+)/)
  if (match) return Number(match[1])
  const uploaded = record.uploaded_at
  if (typeof uploaded === 'string') {
    const ms = Date.parse(uploaded)
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000)
  }
  return 0
}

export function getBatchReportingPeriod(record: HiveRecord): string {
  if (typeof record.reporting_period === 'string' && record.reporting_period.trim()) {
    return record.reporting_period.trim()
  }
  return '—'
}

export function formatBatchUploadedAt(record: HiveRecord): string {
  if (typeof record.uploaded_at === 'string' && record.uploaded_at.trim()) {
    const ms = Date.parse(record.uploaded_at)
    if (!Number.isNaN(ms)) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(ms))
    }
    return record.uploaded_at
  }
  const epoch = getBatchEpoch(record)
  if (epoch > 0) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(epoch * 1000))
  }
  return '—'
}

export function formatAlertMetricsSummary(record: HiveRecord): string {
  const metrics = getHostAlertMetrics(record)
  const entries = Object.entries(metrics)
  if (entries.length === 0) return '—'
  return entries.map(([key, value]) => `${key}: ${value}`).join(', ')
}

export function hostBatchMatchesQuery(record: HiveRecord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    record.hive_org_id,
    record.org_id,
    record.host_id,
    record.sk,
    record.pk,
    record.reporting_period,
    record.uploaded_at,
    hostUploadSummary(record),
    formatAlertMetricsSummary(record),
  ]
    .filter(Boolean)
    .map(String)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function sortHostBatches(records: HiveRecord[], sort: HostBatchSort): HiveRecord[] {
  const sorted = [...records]
  sorted.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return getBatchEpoch(a) - getBatchEpoch(b)
      case 'org':
        return (
          String(a.hive_org_id ?? '').localeCompare(String(b.hive_org_id ?? '')) ||
          getBatchEpoch(b) - getBatchEpoch(a)
        )
      case 'host':
        return (
          String(a.host_id ?? '').localeCompare(String(b.host_id ?? '')) ||
          getBatchEpoch(b) - getBatchEpoch(a)
        )
      case 'period':
        return (
          getBatchReportingPeriod(b).localeCompare(getBatchReportingPeriod(a)) ||
          getBatchEpoch(b) - getBatchEpoch(a)
        )
      case 'newest':
      default:
        return getBatchEpoch(b) - getBatchEpoch(a)
    }
  })
  return sorted
}

export function filterAndSortHostBatches(
  records: HiveRecord[],
  options: { query?: string; sort?: HostBatchSort }
): HiveRecord[] {
  const query = options.query ?? ''
  const filtered = records.filter((record) => hostBatchMatchesQuery(record, query))
  return sortHostBatches(filtered, options.sort ?? 'newest')
}

export function signatureSummary(record: HiveRecord): string {
  return String(record.phrase ?? record.signature_id ?? record.sk ?? '—')
}

export type SignatureStatusFilter = 'all' | 'approved' | 'pending' | 'rejected' | 'other'

export type SignatureSort =
  | 'status'
  | 'org'
  | 'phrase'
  | 'approved_newest'
  | 'rule_id'

export function getSignatureStatus(record: HiveRecord): string {
  return String(record.approval_status ?? '').toLowerCase().trim() || 'unknown'
}

export function getSignatureRuleId(record: HiveRecord): string {
  if (typeof record.signature_id === 'string' && record.signature_id.trim()) {
    return record.signature_id.trim()
  }
  const sk = String(record.sk ?? '')
  if (sk.startsWith('SIG#')) return sk.slice(4)
  return sk || '—'
}

export function getSignatureApprovedBy(record: HiveRecord): string {
  const by = record.approved_by
  return typeof by === 'string' && by.trim() ? by.trim() : '—'
}

export function getSignatureApprovedEpoch(record: HiveRecord): number {
  const raw = record.approved_utc
  if (typeof raw === 'number') {
    return raw > 1e12 ? Math.floor(raw / 1000) : raw
  }
  if (typeof raw === 'string' && raw.trim()) {
    const trimmed = raw.trim()
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed)
      return n > 1e12 ? Math.floor(n / 1000) : n
    }
    const ms = Date.parse(trimmed)
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000)
  }
  return 0
}

export function formatSignatureApprovedAt(record: HiveRecord): string {
  const epoch = getSignatureApprovedEpoch(record)
  if (epoch > 0) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(epoch * 1000))
  }
  if (typeof record.approved_utc === 'string' && record.approved_utc.trim()) {
    return record.approved_utc
  }
  return '—'
}

export function signatureMatchesQuery(record: HiveRecord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    record.hive_org_id,
    record.org_id,
    record.pk,
    record.sk,
    record.signature_id,
    record.phrase,
    record.approval_status,
    record.approved_by,
    record.approved_utc,
    record.domain,
    record.signature_type,
    record.severity,
    signatureSummary(record),
    getSignatureRuleId(record),
  ]
    .filter(Boolean)
    .map(String)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function signatureMatchesStatusFilter(
  record: HiveRecord,
  filter: SignatureStatusFilter
): boolean {
  if (filter === 'all') return true
  const status = getSignatureStatus(record)
  if (filter === 'approved') return status === 'approved'
  if (filter === 'pending') return status === 'pending'
  if (filter === 'rejected') return status === 'rejected'
  return status !== 'approved' && status !== 'pending' && status !== 'rejected'
}

export function sortSignatures(records: HiveRecord[], sort: SignatureSort): HiveRecord[] {
  const sorted = [...records]
  sorted.sort((a, b) => {
    switch (sort) {
      case 'org':
        return (
          String(a.hive_org_id ?? '').localeCompare(String(b.hive_org_id ?? '')) ||
          getSignatureRuleId(a).localeCompare(getSignatureRuleId(b))
        )
      case 'phrase':
        return signatureSummary(a).localeCompare(signatureSummary(b))
      case 'rule_id':
        return getSignatureRuleId(a).localeCompare(getSignatureRuleId(b))
      case 'approved_newest':
        return getSignatureApprovedEpoch(b) - getSignatureApprovedEpoch(a)
      case 'status':
      default:
        return (
          getSignatureStatus(a).localeCompare(getSignatureStatus(b)) ||
          String(a.hive_org_id ?? '').localeCompare(String(b.hive_org_id ?? ''))
        )
    }
  })
  return sorted
}

export function filterAndSortSignatures(
  records: HiveRecord[],
  options: {
    query?: string
    status?: SignatureStatusFilter
    sort?: SignatureSort
  }
): HiveRecord[] {
  const status = options.status ?? 'all'
  const query = options.query ?? ''
  const filtered = records.filter(
    (record) => signatureMatchesStatusFilter(record, status) && signatureMatchesQuery(record, query)
  )
  return sortSignatures(filtered, options.sort ?? 'status')
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

export function getAiReportOutput(record: HiveRecord): Record<string, unknown> | null {
  const aiReport = getRecordObject(record.ai_report)
  if (!aiReport) return null
  return getRecordObject(aiReport.raw_ai_output) ?? aiReport
}

export function getLeadershipBrief(record: HiveRecord): string | null {
  const output = getAiReportOutput(record)
  const brief = output?.leadership_brief
  return typeof brief === 'string' && brief.trim() ? brief.trim() : null
}

export function getAiRecommendations(record: HiveRecord): string[] {
  const output = getAiReportOutput(record)
  if (!Array.isArray(output?.recommendations)) return []
  return output!.recommendations.filter((entry): entry is string => typeof entry === 'string')
}

export function getCandidateSignaturesFromAi(record: HiveRecord): Record<string, unknown>[] {
  const output = getAiReportOutput(record)
  if (!Array.isArray(output?.candidate_signatures)) return []
  return output!.candidate_signatures.filter(
    (entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
  )
}

export function alertCountsTotal(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0)
}
