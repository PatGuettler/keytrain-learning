export type ComplianceDocumentType =
  | 'disaster_recovery'
  | 'incident_response'
  | 'hipaa_risk_analysis'
  | 'acceptable_use'
  | 'vulnerability_management'
  | 'security_awareness'

export type ComplianceDocumentStatus = 'draft' | 'in_review' | 'approved'

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceDocumentStatus, string> = {
  draft: 'In progress',
  in_review: 'In review',
  approved: 'Approved',
}

export const COMPLIANCE_DOC_TYPE_LABELS: Record<ComplianceDocumentType, string> = {
  disaster_recovery: 'Disaster Recovery',
  incident_response: 'Incident Response',
  hipaa_risk_analysis: 'HIPAA Risk Analysis',
  acceptable_use: 'Acceptable Use',
  vulnerability_management: 'Vulnerability Management',
  security_awareness: 'Security Awareness',
}

export type ComplianceTemplate = {
  id: string
  doc_type: ComplianceDocumentType
  title: string
  template_structure: {
    sections: Array<{ id: string; label: string; type: string }>
  }
  created_at: string
}

export type ComplianceDocument = {
  id: string
  doc_type: ComplianceDocumentType
  title: string
  status: ComplianceDocumentStatus
  hive_org_id: string | null
  current_version_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ComplianceDocumentVersion = {
  id: string
  document_id: string
  version_number: number
  content: Record<string, string>
  aws_data_snapshot: Record<string, unknown> | null
  created_by: string | null
  created_at: string
}
