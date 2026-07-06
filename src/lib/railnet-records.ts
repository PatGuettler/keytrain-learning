import type { RailNetRecord } from '@/types/railnet.types'

export type HostUploadKind = 'batch' | 'legacy_ioc' | 'other'

export function classifyHostUpload(record: RailNetRecord): HostUploadKind {
  const sk = String(record.sk ?? '')
  if (sk.startsWith('BATCH#')) return 'batch'
  if (sk.startsWith('TS#')) return 'legacy_ioc'
  return 'other'
}

export function getTrendReportingPeriod(record: RailNetRecord): string {
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

export function getTrendRawMetrics(record: RailNetRecord): Record<string, unknown> | null {
  return getRecordObject(record.raw_metrics)
}

export function getAlertCounts(record: RailNetRecord): Record<string, number> {
  const metrics = getTrendRawMetrics(record)
  const alertCounts = getRecordObject(metrics?.alert_counts)
  if (!alertCounts) return {}

  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(alertCounts)) {
    if (typeof value === 'number') result[key] = value
  }
  return result
}

export function getRiskScores(record: RailNetRecord): Record<string, number> {
  const metrics = getTrendRawMetrics(record)
  const riskScores = getRecordObject(metrics?.risk_scores)
  if (!riskScores) return {}

  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(riskScores)) {
    if (typeof value === 'number') result[key] = value
  }
  return result
}

export function splitHostUploads(records: RailNetRecord[]) {
  const batches: RailNetRecord[] = []
  const legacyIocs: RailNetRecord[] = []
  const other: RailNetRecord[] = []

  for (const record of records) {
    const kind = classifyHostUpload(record)
    if (kind === 'batch') batches.push(record)
    else if (kind === 'legacy_ioc') legacyIocs.push(record)
    else other.push(record)
  }

  return { batches, legacyIocs, other }
}

export function countSignaturesByStatus(records: RailNetRecord[]) {
  const counts = { approved: 0, pending: 0, other: 0 }
  for (const record of records) {
    const status = String(record.approval_status ?? '').toLowerCase()
    if (status === 'approved') counts.approved += 1
    else if (status === 'pending') counts.pending += 1
    else counts.other += 1
  }
  return counts
}

export function isPendingSignature(record: RailNetRecord): boolean {
  return String(record.approval_status ?? '').toLowerCase() === 'pending'
}

export function hostUploadSummary(record: RailNetRecord): string {
  const hostId = record.host_id ? String(record.host_id) : 'Unknown host'
  const sk = String(record.sk ?? '')
  if (sk.startsWith('BATCH#')) return `${hostId} · batch ${sk.replace('BATCH#', '')}`
  if (record.indicator) return `${hostId} · ${String(record.indicator)}`
  return hostId
}

export type HostBatchSort = 'newest' | 'oldest' | 'org' | 'host' | 'period'

export function getBatchEpoch(record: RailNetRecord): number {
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

export function getBatchReportingPeriod(record: RailNetRecord): string {
  if (typeof record.reporting_period === 'string' && record.reporting_period.trim()) {
    return record.reporting_period.trim()
  }
  return '—'
}

export function formatBatchUploadedAt(record: RailNetRecord): string {
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

export function formatAlertMetricsSummary(record: RailNetRecord): string {
  const metrics = getHostAlertMetrics(record)
  const entries = Object.entries(metrics)
  if (entries.length === 0) return '—'
  return entries.map(([key, value]) => `${key}: ${value}`).join(', ')
}

export function hostBatchMatchesQuery(record: RailNetRecord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    record.railnet_org_id,
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

export function sortHostBatches(records: RailNetRecord[], sort: HostBatchSort): RailNetRecord[] {
  const sorted = [...records]
  sorted.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return getBatchEpoch(a) - getBatchEpoch(b)
      case 'org':
        return (
          String(a.railnet_org_id ?? '').localeCompare(String(b.railnet_org_id ?? '')) ||
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
  records: RailNetRecord[],
  options: { query?: string; sort?: HostBatchSort }
): RailNetRecord[] {
  const query = options.query ?? ''
  const filtered = records.filter((record) => hostBatchMatchesQuery(record, query))
  return sortHostBatches(filtered, options.sort ?? 'newest')
}

export function signatureSummary(record: RailNetRecord): string {
  return String(record.phrase ?? record.signature_id ?? record.sk ?? '—')
}

export type SignatureStatusFilter = 'all' | 'approved' | 'pending' | 'rejected' | 'other'

export type SignatureSort =
  | 'status'
  | 'org'
  | 'phrase'
  | 'approved_newest'
  | 'rule_id'

export function getSignatureStatus(record: RailNetRecord): string {
  return String(record.approval_status ?? '').toLowerCase().trim() || 'unknown'
}

export function getSignatureRuleId(record: RailNetRecord): string {
  if (typeof record.signature_id === 'string' && record.signature_id.trim()) {
    return record.signature_id.trim()
  }
  const sk = String(record.sk ?? '')
  if (sk.startsWith('SIG#')) return sk.slice(4)
  return sk || '—'
}

export function getSignatureApprovedBy(record: RailNetRecord): string {
  const by = record.approved_by
  return typeof by === 'string' && by.trim() ? by.trim() : '—'
}

export function getSignatureApprovedEpoch(record: RailNetRecord): number {
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

export function formatSignatureApprovedAt(record: RailNetRecord): string {
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

export function signatureMatchesQuery(record: RailNetRecord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    record.railnet_org_id,
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
  record: RailNetRecord,
  filter: SignatureStatusFilter
): boolean {
  if (filter === 'all') return true
  const status = getSignatureStatus(record)
  if (filter === 'approved') return status === 'approved'
  if (filter === 'pending') return status === 'pending'
  if (filter === 'rejected') return status === 'rejected'
  return status !== 'approved' && status !== 'pending' && status !== 'rejected'
}

export function sortSignatures(records: RailNetRecord[], sort: SignatureSort): RailNetRecord[] {
  const sorted = [...records]
  sorted.sort((a, b) => {
    switch (sort) {
      case 'org':
        return (
          String(a.railnet_org_id ?? '').localeCompare(String(b.railnet_org_id ?? '')) ||
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
          String(a.railnet_org_id ?? '').localeCompare(String(b.railnet_org_id ?? ''))
        )
    }
  })
  return sorted
}

export function filterAndSortSignatures(
  records: RailNetRecord[],
  options: {
    query?: string
    status?: SignatureStatusFilter
    sort?: SignatureSort
  }
): RailNetRecord[] {
  const status = options.status ?? 'all'
  const query = options.query ?? ''
  const filtered = records.filter(
    (record) => signatureMatchesStatusFilter(record, status) && signatureMatchesQuery(record, query)
  )
  return sortSignatures(filtered, options.sort ?? 'status')
}

export function trainingSummary(record: RailNetRecord): string {
  const period = record.reporting_period ?? getTrendReportingPeriod(record)
  const count = record.total_question_count ?? (Array.isArray(record.questions) ? record.questions.length : null)
  const parts = [String(period)]
  if (count != null) parts.push(`${count} questions`)
  if (record.assignment_type) parts.push(String(record.assignment_type))
  return parts.join(' · ')
}

export function trendReportKey(record: RailNetRecord): string {
  return `${String(record.pk ?? '')}|${String(record.sk ?? '')}`
}

export function trendReportLabel(record: RailNetRecord): string {
  const org = String(record.railnet_org_id ?? '—')
  const period = getTrendReportingPeriod(record)
  const sk = String(record.sk ?? '')
  return `${org} · ${period}${sk ? ` · ${sk}` : ''}`
}

export function sortTrendReports(reports: RailNetRecord[]): RailNetRecord[] {
  return [...reports].sort((a, b) => {
    const byPeriod = getTrendReportingPeriod(b).localeCompare(getTrendReportingPeriod(a))
    if (byPeriod !== 0) return byPeriod
    return String(a.railnet_org_id ?? '').localeCompare(String(b.railnet_org_id ?? ''))
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

export function getHostAlertMetrics(record: RailNetRecord): Record<string, number> {
  return getNumericRecordMap(record.alert_metrics)
}

export function sumHostAlertMetrics(batches: RailNetRecord[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const batch of batches) {
    for (const [key, value] of Object.entries(getHostAlertMetrics(batch))) {
      totals[key] = (totals[key] ?? 0) + value
    }
  }
  return totals
}

export function getBatchesForTrendReport(
  batches: RailNetRecord[],
  report: RailNetRecord
): RailNetRecord[] {
  const orgId = String(report.railnet_org_id ?? '')
  const period = getTrendReportingPeriod(report)
  return batches.filter((batch) => {
    if (String(batch.railnet_org_id ?? '') !== orgId) return false
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

export function getDomainCounts(record: RailNetRecord): Record<string, number> {
  const metrics = getTrendRawMetrics(record)
  return getNumericRecordMap(metrics?.domain_counts)
}

export function getTrainingSummaryMetrics(record: RailNetRecord): Record<string, unknown> | null {
  const metrics = getTrendRawMetrics(record)
  return getRecordObject(metrics?.training_summary)
}

export function getSoftwareFindingsFromTrend(record: RailNetRecord): unknown[] {
  const metrics = getTrendRawMetrics(record)
  const findings = metrics?.software_findings
  return Array.isArray(findings) ? findings : []
}

export function getIocSummary(record: RailNetRecord): Record<string, unknown> | null {
  const metrics = getTrendRawMetrics(record)
  return getRecordObject(metrics?.ioc_summary)
}

export function getAiReportOutput(record: RailNetRecord): Record<string, unknown> | null {
  const aiReport = getRecordObject(record.ai_report)
  if (!aiReport) return null
  return getRecordObject(aiReport.raw_ai_output) ?? aiReport
}

export function getLeadershipBrief(record: RailNetRecord): string | null {
  const output = getAiReportOutput(record)
  const brief = output?.leadership_brief
  return typeof brief === 'string' && brief.trim() ? brief.trim() : null
}

export function getAiRecommendations(record: RailNetRecord): string[] {
  const output = getAiReportOutput(record)
  if (!Array.isArray(output?.recommendations)) return []
  return output!.recommendations.filter((entry): entry is string => typeof entry === 'string')
}

export function getCandidateSignaturesFromAi(record: RailNetRecord): Record<string, unknown>[] {
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
