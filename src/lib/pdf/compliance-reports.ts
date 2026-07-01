import type { ComplianceDocument, ComplianceTemplate } from '@/types/compliance.types'
import type { ComplianceDocumentVersion } from '@/types/compliance.types'
import {
  addDataTable,
  addSectionHeading,
  createDashboardPdf,
  pdfStartY,
  saveDashboardPdf,
} from '@/lib/pdf/pdf-base'
import { COMPLIANCE_DOC_TYPE_LABELS } from '@/types/compliance.types'

export function exportComplianceDocumentPdf(
  document: ComplianceDocument,
  template: ComplianceTemplate | null,
  version: ComplianceDocumentVersion
) {
  const subtitle = [
    document.hive_org_id ? `Org: ${document.hive_org_id}` : null,
    `Status: ${document.status}`,
    `Version ${version.version_number}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const doc = createDashboardPdf(document.title, subtitle)
  let y = pdfStartY(subtitle)

  const sections = template?.template_structure?.sections ?? []
  if (sections.length === 0) {
    y = addSectionHeading(doc, 'Content', y)
    addDataTable(
      doc,
      ['Section', 'Text'],
      Object.entries(version.content).map(([key, value]) => [key, value]),
      y
    )
  } else {
    for (const section of sections) {
      y = addSectionHeading(doc, section.label, y)
      const text = version.content[section.id] ?? '—'
      const lines = doc.splitTextToSize(text, 180)
      doc.setFontSize(10)
      doc.setTextColor(40)
      doc.text(lines, 14, y)
      y += lines.length * 5 + 8
      if (y > 260) {
        doc.addPage()
        y = 20
      }
    }
  }

  const typeLabel =
    COMPLIANCE_DOC_TYPE_LABELS[document.doc_type] ?? document.doc_type
  saveDashboardPdf(
    doc,
    `${typeLabel}-${document.hive_org_id ?? 'org'}-v${version.version_number}`
  )
}
