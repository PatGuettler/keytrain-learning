import { jsPDF } from 'jspdf'
import { APP_NAME } from '@/lib/constants'
import { reportTimestamp, slugifyFilename } from '@/lib/pdf/pdf-base'
import type { Certificate } from '@/types/course.types'

const BRAND_RGB: [number, number, number] = [13, 148, 136]

export function downloadCertificatePdf(opts: {
  certificate: Certificate
  courseTitle: string
  learnerName: string
}) {
  const { certificate, courseTitle, learnerName } = opts
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()

  doc.setDrawColor(...BRAND_RGB)
  doc.setLineWidth(1.5)
  doc.rect(10, 10, w - 20, h - 20)

  doc.setFontSize(14)
  doc.setTextColor(...BRAND_RGB)
  doc.text(APP_NAME, w / 2, 32, { align: 'center' })

  doc.setFontSize(28)
  doc.setTextColor(30)
  doc.text('Certificate of Completion', w / 2, 55, { align: 'center' })

  doc.setFontSize(12)
  doc.setTextColor(80)
  doc.text('This certifies that', w / 2, 75, { align: 'center' })

  doc.setFontSize(22)
  doc.setTextColor(20)
  doc.text(learnerName || 'Learner', w / 2, 90, { align: 'center' })

  doc.setFontSize(12)
  doc.setTextColor(80)
  doc.text('has successfully completed', w / 2, 105, { align: 'center' })

  doc.setFontSize(18)
  doc.setTextColor(...BRAND_RGB)
  doc.text(courseTitle, w / 2, 120, { align: 'center' })

  const issued = new Date(certificate.issued_at).toLocaleDateString(undefined, {
    dateStyle: 'long',
  })
  doc.setFontSize(11)
  doc.setTextColor(80)
  doc.text(`Issued ${issued}`, w / 2, 140, { align: 'center' })

  if (certificate.expires_at) {
    const expires = new Date(certificate.expires_at).toLocaleDateString(undefined, {
      dateStyle: 'long',
    })
    doc.text(`Expires ${expires}`, w / 2, 148, { align: 'center' })
  }

  doc.setFontSize(8)
  doc.setTextColor(140)
  doc.text(`Certificate ID: ${certificate.id}`, w / 2, h - 22, { align: 'center' })
  doc.text(`Generated ${reportTimestamp()}`, w / 2, h - 16, { align: 'center' })

  doc.save(`${slugifyFilename(courseTitle)}-certificate.pdf`)
}
