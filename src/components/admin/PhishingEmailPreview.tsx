import { useEffect, useRef, useState } from 'react'
import { buildPhishingPreviewDocument } from '@/lib/phishing-preview'

type PhishingEmailPreviewProps = {
  subject: string
  senderName: string
  senderEmail: string
  bodyHtml: string
}

export function PhishingEmailPreview({
  subject,
  senderName,
  senderEmail,
  bodyHtml,
}: PhishingEmailPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(320)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const resize = () => {
      try {
        const doc = iframe.contentDocument
        if (!doc?.body) return
        const next = Math.min(Math.max(doc.body.scrollHeight + 16, 200), 720)
        setHeight(next)
      } catch {
        /* cross-origin guard — should not happen with srcDoc */
      }
    }

    iframe.addEventListener('load', resize)
    resize()
    return () => iframe.removeEventListener('load', resize)
  }, [bodyHtml, subject, senderName, senderEmail])

  if (!bodyHtml.trim()) {
    return (
      <p className="text-sm text-muted-foreground rounded-md border border-dashed p-4">
        Select a template or add HTML to preview the email.
      </p>
    )
  }

  const fromLine = senderEmail.trim()
    ? `${senderName.trim() || 'Sender'} <${senderEmail.trim()}>`
    : senderName.trim() || 'Sender'

  return (
    <div className="space-y-3 rounded-lg border bg-card overflow-hidden">
      <div className="space-y-1 border-b bg-muted/40 px-3 py-2 text-sm">
        <p className="truncate">
          <span className="text-muted-foreground">From: </span>
          <span className="font-medium">{fromLine}</span>
        </p>
        <p className="truncate">
          <span className="text-muted-foreground">Subject: </span>
          <span className="font-medium">{subject.trim() || '(no subject)'}</span>
        </p>
      </div>
      <div className="px-2 pb-2">
        <iframe
          ref={iframeRef}
          title="Phishing email preview"
          sandbox=""
          className="w-full rounded-md border bg-white"
          style={{ height }}
          srcDoc={buildPhishingPreviewDocument(bodyHtml)}
        />
      </div>
      <p className="px-3 pb-3 text-xs text-muted-foreground">
        Preview uses sample names (e.g. Memorial Hospital). Placeholders resolve per recipient when sent.
      </p>
    </div>
  )
}
