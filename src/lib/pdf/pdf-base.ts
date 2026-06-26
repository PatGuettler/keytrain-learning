import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { APP_NAME } from '@/lib/constants'

const BRAND_RGB: [number, number, number] = [13, 148, 136]

type JsPDFWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number }
}

export function reportTimestamp(): string {
  return new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function slugifyFilename(text: string): string {
  return (
    text
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'report'
  )
}

function addPageFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(130)
    doc.text(
      `${APP_NAME} · Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
  }
}

export function createDashboardPdf(title: string, subtitle?: string): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFontSize(16)
  doc.setTextColor(...BRAND_RGB)
  doc.text(title, 14, 18)

  let y = 25
  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(80)
    doc.text(subtitle, 14, y)
    y += 6
  }

  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Generated ${reportTimestamp()}`, 14, y)
  y += 4

  doc.setDrawColor(...BRAND_RGB)
  doc.line(14, y, 196, y)

  return doc
}

export function pdfStartY(subtitle?: string): number {
  return subtitle ? 42 : 36
}

export function addMetricsSection(
  doc: jsPDF,
  metrics: { label: string; value: string }[],
  startY: number
): number {
  autoTable(doc, {
    startY,
    head: [['Metric', 'Value']],
    body: metrics.map((m) => [m.label, m.value]),
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND_RGB, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 70 } },
    margin: { left: 14, right: 14 },
  })
  return ((doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? startY) + 8
}

export function addSectionHeading(doc: jsPDF, title: string, startY: number): number {
  doc.setFontSize(11)
  doc.setTextColor(40)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, startY)
  doc.setFont('helvetica', 'normal')
  return startY + 8
}

export function addDataTable(
  doc: jsPDF,
  head: string[],
  body: (string | number)[][],
  startY: number,
  columnStyles?: Record<number, { cellWidth?: number | 'auto' | 'wrap' }>
): number {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: BRAND_RGB, textColor: 255, fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
    columnStyles,
  })
  return ((doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? startY) + 10
}

export function saveDashboardPdf(doc: jsPDF, filename: string) {
  addPageFooter(doc)
  doc.save(`${slugifyFilename(filename)}.pdf`)
}
