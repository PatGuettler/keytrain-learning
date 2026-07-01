import type { HiveDataResponse } from '@/types/hive.types'
import {
  countSignaturesByStatus,
  getAlertCounts,
  getBatchesForTrendReport,
  getRiskScores,
  getTrendReportingPeriod,
  hostUploadSummary,
  reconcileAlertCounts,
  signatureSummary,
  splitHostUploads,
  sumHostAlertMetrics,
  trainingSummary,
} from '@/lib/hive-records'
import {
  addDataTable,
  addMetricsSection,
  addSectionHeading,
  createDashboardPdf,
  pdfStartY,
  saveDashboardPdf,
} from '@/lib/pdf/pdf-base'

function orgFilterLabel(selectedOrgIds: string[], availableOrgIds: string[]): string {
  if (selectedOrgIds.length > 0) {
    return `Organizations: ${selectedOrgIds.join(', ')}`
  }
  if (availableOrgIds.length > 0) {
    return `All organizations (${availableOrgIds.join(', ')})`
  }
  return 'All organizations (no data in AWS)'
}

function formatFetchedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function exportHiveReportPdf(data: HiveDataResponse, selectedOrgIds: string[]) {
  const subtitle = orgFilterLabel(selectedOrgIds, data.org_ids)
  const doc = createDashboardPdf('Hive Security Report', subtitle)
  let y = pdfStartY(subtitle)

  const signatureStatus = countSignaturesByStatus(data.signatures)
  const { batches, legacyIocs } = splitHostUploads(data.indicators)

  y = addMetricsSection(
    doc,
    [
      { label: 'AWS region', value: data.region },
      { label: 'Data fetched', value: formatFetchedAt(data.fetched_at) },
      { label: 'Host batches', value: String(data.counts.host_batches ?? batches.length) },
      { label: 'Legacy IOC rows', value: String(data.counts.legacy_iocs ?? legacyIocs.length) },
      { label: 'Signatures (approved)', value: String(signatureStatus.approved) },
      { label: 'Signatures (pending)', value: String(signatureStatus.pending) },
      { label: 'Trend reports', value: String(data.counts.trend_reports) },
      { label: 'Training assignments', value: String(data.counts.training_assignments) },
    ],
    y
  )

  if (legacyIocs.length > 0) {
    doc.setFontSize(9)
    doc.setTextColor(140, 90, 0)
    doc.text(
      `Note: ${legacyIocs.length} legacy TS# row(s) remain in KeyTrainHiveIndicators pending AWS migration.`,
      14,
      y
    )
    y += 8
  }

  y = addSectionHeading(doc, 'Security posture — signatures', y)
  if (data.signatures.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text('No signatures for the selected org filter.', 14, y)
    y += 8
  } else {
    y = addDataTable(
      doc,
      ['Org', 'Phrase / rule', 'Domain', 'Type', 'Status', 'Severity'],
      data.signatures.map((record) => [
        String(record.hive_org_id ?? '—'),
        signatureSummary(record),
        record.domain ? String(record.domain) : '—',
        record.signature_type ? String(record.signature_type) : '—',
        record.approval_status ? String(record.approval_status) : '—',
        record.severity ? String(record.severity) : '—',
      ]),
      y,
      {
        0: { cellWidth: 22 },
        1: { cellWidth: 45 },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 },
      }
    )
  }

  y = addSectionHeading(doc, 'Reporting — trend reports', y)
  if (data.trend_reports.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text('No trend reports for the selected org filter.', 14, y)
    y += 8
  } else {
    y = addDataTable(
      doc,
      ['Org', 'Period', 'Alert total', 'Risk scores', 'Alert counts', 'Reconcile', 'Sort key'],
      data.trend_reports.map((record) => {
        const risks = getRiskScores(record)
        const alerts = getAlertCounts(record)
        const riskText =
          Object.keys(risks).length > 0
            ? Object.entries(risks)
                .map(([k, v]) => `${k}: ${v}`)
                .join('; ')
            : '—'
        const alertText =
          Object.keys(alerts).length > 0
            ? Object.entries(alerts)
                .map(([k, v]) => `${k}: ${v}`)
                .join('; ')
            : '—'
        const alertTotal = Object.values(alerts).reduce((s, v) => s + v, 0)
        const batches = getBatchesForTrendReport(
          splitHostUploads(data.indicators).batches,
          record
        )
        const hostSum = sumHostAlertMetrics(batches)
        const reconcileNote =
          batches.length > 0
            ? reconcileAlertCounts(alerts, hostSum).every((r) => r.matches)
              ? 'host sum matches'
              : 'host sum differs'
            : 'no host batches'
        return [
          String(record.hive_org_id ?? '—'),
          getTrendReportingPeriod(record),
          String(alertTotal || '—'),
          riskText,
          alertText,
          reconcileNote,
          record.sk ? String(record.sk) : '—',
        ]
      }),
      y,
      {
        0: { cellWidth: 18 },
        1: { cellWidth: 14 },
        2: { cellWidth: 14 },
        3: { cellWidth: 32 },
        4: { cellWidth: 32 },
        5: { cellWidth: 18 },
        6: { cellWidth: 'wrap' },
      }
    )
  }

  y = addSectionHeading(doc, 'Host uploads — monthly batches', y)
  if (batches.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text('No BATCH# host uploads for the selected org filter.', 14, y)
    y += 8
  } else {
    y = addDataTable(
      doc,
      ['Org', 'Summary', 'Host', 'Sort key'],
      batches.map((record) => [
        String(record.hive_org_id ?? '—'),
        hostUploadSummary(record),
        record.host_id ? String(record.host_id) : '—',
        record.sk ? String(record.sk) : '—',
      ]),
      y,
      {
        0: { cellWidth: 22 },
        1: { cellWidth: 55 },
        2: { cellWidth: 28 },
        3: { cellWidth: 'wrap' },
      }
    )
  }

  if (legacyIocs.length > 0) {
    y = addSectionHeading(doc, 'Host uploads — legacy IOC rows (TS#)', y)
    y = addDataTable(
      doc,
      ['Org', 'Summary', 'Indicator', 'Severity', 'Sort key'],
      legacyIocs.map((record) => [
        String(record.hive_org_id ?? '—'),
        hostUploadSummary(record),
        record.indicator ? String(record.indicator) : '—',
        record.severity ? String(record.severity) : '—',
        record.sk ? String(record.sk) : '—',
      ]),
      y,
      {
        0: { cellWidth: 22 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { cellWidth: 18 },
        4: { cellWidth: 'wrap' },
      }
    )
  }

  y = addSectionHeading(doc, 'Training — monthly assignments', y)
  addDataTable(
    doc,
    ['Org', 'Summary', 'Questions', 'Trend report', 'Sort key'],
    data.training_assignments.length === 0
      ? [['—', 'No training assignments for the selected org filter.', '—', '—', '—']]
      : data.training_assignments.map((record) => [
          String(record.hive_org_id ?? '—'),
          trainingSummary(record),
          record.total_question_count != null
            ? String(record.total_question_count)
            : Array.isArray(record.questions)
              ? String(record.questions.length)
              : '—',
          record.trend_report_sk ? String(record.trend_report_sk) : '—',
          record.sk ? String(record.sk) : '—',
        ]),
    y,
    {
      0: { cellWidth: 20 },
      1: { cellWidth: 45 },
      2: { cellWidth: 18 },
      3: { cellWidth: 35 },
      4: { cellWidth: 'wrap' },
    }
  )

  const orgSlug =
    selectedOrgIds.length === 1
      ? selectedOrgIds[0]
      : selectedOrgIds.length > 1
        ? `${selectedOrgIds.length}-orgs`
        : 'all-orgs'

  saveDashboardPdf(doc, `hive-report-${orgSlug}-${new Date().toISOString().slice(0, 10)}`)
}
