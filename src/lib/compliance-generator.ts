import type { CourseExportBundle } from '@/lib/course-export'
import {
  getAlertCounts,
  getLeadershipBrief,
  getRiskScores,
  getSoftwareFindingsFromTrend,
  getTrainingSummaryMetrics,
  getTrendReportingPeriod,
} from '@/lib/hive-records'
import type { ComplianceDocumentType } from '@/types/compliance.types'
import type { HiveRecord } from '@/types/hive.types'

export type ComplianceTemplateSection = {
  id: string
  label: string
  type: 'textarea'
}

export type ComplianceTemplateStructure = {
  sections: ComplianceTemplateSection[]
}

export type ComplianceDraftContent = Record<string, string>

export const COMPLIANCE_DISCLAIMER =
  'Auto-filled from KeyTrain RailNet security telemetry only. Not legal advice. No patient data (ePHI) is stored in RailNet or used to generate this document. A qualified reviewer must edit before use.'

/** @deprecated Use COMPLIANCE_DISCLAIMER */
export const COMPLIANCE_DRAFT_DISCLAIMER = COMPLIANCE_DISCLAIMER

export function isTestHiveOrg(orgId: string): boolean {
  return orgId.startsWith('hive-test-') || orgId.startsWith('testorg')
}

function approvedSignaturesText(signatures: HiveRecord[]): string {
  const approved = signatures.filter(
    (s) => String(s.approval_status ?? '').toLowerCase() === 'approved'
  )
  if (approved.length === 0) return 'No approved signatures on file.'
  return approved
    .map(
      (s) =>
        `• ${s.phrase ?? s.signature_id} (${s.domain ?? 'general'}, ${s.severity ?? '—'})`
    )
    .join('\n')
}

function softwareFindingsText(trendReport: HiveRecord | null): string {
  const findings = trendReport ? getSoftwareFindingsFromTrend(trendReport) : []
  if (findings.length === 0) return 'No outdated software findings in the latest trend report.'
  return findings
    .map((item) => {
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>
        return `• ${row.product ?? 'Software'} ${row.version ?? ''} — ${row.severity ?? '—'}`
      }
      return `• ${String(item)}`
    })
    .join('\n')
}

export function buildComplianceDraftContent(
  docType: ComplianceDocumentType,
  orgId: string,
  trendReport: HiveRecord | null,
  signatures: HiveRecord[]
): ComplianceDraftContent {
  const period = trendReport ? getTrendReportingPeriod(trendReport) : '—'
  const risks = trendReport ? getRiskScores(trendReport) : {}
  const alerts = trendReport ? getAlertCounts(trendReport) : {}
  const training = trendReport ? getTrainingSummaryMetrics(trendReport) : null
  const weakDomains = Array.isArray(training?.weak_domains)
    ? (training!.weak_domains as string[]).join(', ')
    : '—'
  const avgScore =
    typeof training?.average_score === 'number' ? String(training.average_score) : '—'

  const alertSummary = Object.entries(alerts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  const riskSummary = Object.entries(risks)
    .map(([k, v]) => `${k}: ${v}/100`)
    .join(', ')

  const leadershipBrief = trendReport ? getLeadershipBrief(trendReport) : null

  const executive = [
    COMPLIANCE_DISCLAIMER,
    '',
    `Organization: ${orgId}`,
    isTestHiveOrg(orgId) ? 'Environment: test/demo (not production PHI)' : '',
    `Reporting period: ${period}`,
    riskSummary ? `Risk scores — ${riskSummary}` : '',
    alertSummary ? `Alert counts — ${alertSummary}` : '',
    leadershipBrief ? `\nLeadership brief:\n${leadershipBrief}` : '',
    '',
    'Metrics above are security alerts and risk scores from AWS RailNet — not clinical or patient records.',
  ]
    .filter(Boolean)
    .join('\n')

  const base: ComplianceDraftContent = {
    executive_summary: executive,
  }

  switch (docType) {
    case 'disaster_recovery':
      return {
        ...base,
        recovery_objectives:
          'Define RTO/RPO for clinical and administrative systems based on organizational impact analysis.',
        critical_systems: 'Document EHR, email, file shares, and backup infrastructure dependencies.',
        backup_procedures: 'Describe backup frequency, offsite replication, and restore testing cadence.',
        communication_plan: 'List incident communication tree and stakeholder notification steps.',
      }
    case 'incident_response':
      return {
        ...base,
        roles_responsibilities:
          'Security lead, IT operations, privacy officer, and executive sponsor roles during incidents.',
        detection_reporting:
          alertSummary
            ? `RailNet detected ${alertSummary} during ${period}. Employees report suspicious activity to IT.`
            : 'Employees report suspicious email and endpoint alerts to IT helpdesk.',
        containment_eradication:
          'Isolate affected hosts, revoke sessions, patch vulnerabilities, and preserve forensic evidence.',
        post_incident_review:
          'Conduct lessons-learned within 5 business days; update signatures and training focus areas.',
      }
    case 'hipaa_risk_analysis':
      return {
        ...base,
        scope: isTestHiveOrg(orgId)
          ? `Scope for ${orgId} (test org). Replace with your organization's actual systems and whether you handle ePHI before compliance use.`
          : `Risk analysis for ${orgId} workforce endpoints and cloud services. [Confirm whether your organization handles ePHI and edit this section.]`,
        threat_landscape: alertSummary
          ? `Security telemetry (not PHI): ${alertSummary}.`
          : 'Phishing, ransomware, and insider threat scenarios.',
        safeguards: approvedSignaturesText(signatures.filter((s) => s.hive_org_id === orgId || !orgId)),
        residual_risk: riskSummary
          ? `Residual risk after controls: ${riskSummary}. Review quarterly.`
          : 'Residual risk to be scored after control review.',
      }
    case 'acceptable_use':
      return {
        ...base,
        purpose: 'Define acceptable use of organizational IT resources for workforce members.',
        acceptable_use:
          'Business email, approved SaaS, and authorized systems per policy; security training required.',
        prohibited_use:
          isTestHiveOrg(orgId)
            ? 'Unauthorized software, credential sharing, unapproved USB devices. [Edit for your policy.]'
            : 'Unauthorized software, credential sharing, unapproved storage of sensitive data, unapproved USB devices.',
        security_awareness: `Average training score: ${avgScore}. Weak domains: ${weakDomains}.`,
      }
    case 'vulnerability_management':
      return {
        ...base,
        scanning_cadence: 'Monthly host telemetry aggregated via KeyTrain RailNet; critical patches within 72 hours.',
        patch_management: 'IT deploys OS and application patches per change window.',
        outdated_software: softwareFindingsText(trendReport),
        remediation_sla: 'Critical: 72h · High: 14d · Medium: 30d · Low: next maintenance cycle.',
      }
    case 'security_awareness':
      return {
        ...base,
        training_program: `Monthly targeted assignments based on RailNet trend analysis (${period}).`,
        weak_domains: weakDomains,
        approved_controls: approvedSignaturesText(
          signatures.filter((s) => String(s.hive_org_id) === orgId)
        ),
      }
    default:
      return base
  }
}

export function bundleFromStagingContent(content: unknown): CourseExportBundle | null {
  if (!content || typeof content !== 'object') return null
  return content as CourseExportBundle
}
