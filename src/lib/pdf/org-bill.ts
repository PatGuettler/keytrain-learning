import type { OrgBillSnapshot } from '@/lib/org-billing'
import {
  PLAN_LABELS,
  PAYMENT_STRUCTURE_COPY,
  formatUsdFromCents,
} from '@/lib/seat-pricing'
import {
  addSectionHeading,
  createDashboardPdf,
  pdfStartY,
  saveDashboardPdf,
} from '@/lib/pdf/pdf-base'

export function exportOrgBillPdf({
  orgName,
  bill,
  termsLockedAt,
}: {
  orgName: string
  bill: OrgBillSnapshot
  termsLockedAt?: string
}) {
  const subtitle = [
    PLAN_LABELS[bill.plan],
    `Total ${formatUsdFromCents(bill.monthlyTotalCents)} / month`,
  ].join(' · ')

  const doc = createDashboardPdf(`${orgName} — Monthly bill`, subtitle)
  let y = pdfStartY(subtitle)

  doc.setFontSize(8)
  doc.setTextColor(120)
  const note = doc.splitTextToSize(PAYMENT_STRUCTURE_COPY.estimatedBanner, 180)
  doc.text(note, 14, y)
  y += note.length * 4 + 8

  y = addSectionHeading(doc, 'Line items', y)
  doc.setFontSize(10)
  doc.setTextColor(40)
  for (const line of bill.lineItems) {
    const label =
      line.key === 'plan_base'
        ? `${line.label}: ${formatUsdFromCents(line.subtotalCents)}`
        : `${line.label} × ${line.quantity} @ ${formatUsdFromCents(line.unitCents)} = ${formatUsdFromCents(line.subtotalCents)}`
    doc.text(label, 14, y)
    y += 6
    if (y > 270) {
      doc.addPage()
      y = 20
    }
  }

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.text(`Monthly total: ${formatUsdFromCents(bill.monthlyTotalCents)}`, 14, y)
  doc.setFont('helvetica', 'normal')
  y += 10

  doc.setFontSize(8)
  doc.setTextColor(120)
  const cycle = doc.splitTextToSize(
    `${PAYMENT_STRUCTURE_COPY.billingCycle} ${PAYMENT_STRUCTURE_COPY.proration}`,
    180
  )
  doc.text(cycle, 14, y)
  y += cycle.length * 4 + 6

  if (termsLockedAt) {
    doc.text(`Rates locked since ${new Date(termsLockedAt).toLocaleDateString()}`, 14, y)
    y += 6
  }

  doc.text(`Generated ${new Date().toLocaleString()}`, 14, y)

  saveDashboardPdf(doc, `bill-${orgName.replace(/\s+/g, '-').toLowerCase()}`)
}
