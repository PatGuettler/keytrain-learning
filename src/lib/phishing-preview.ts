/** Sample values for template preview in the campaign editor (not used when sending). */
const SAMPLE = {
  firstName: 'Alex',
  fullName: 'Alex Morgan',
  companyName: 'Acme Corporation',
  companySlug: 'acme-corp',
  managerName: 'Jordan Smith',
  managerFirstName: 'Jordan',
  senderName: 'IT Support Team',
  senderEmail: 'acme-corp-it-support@keytrainlearning.com',
  senderEmailLocal: 'acme-corp-it-support',
  emailDomain: 'keytrainlearning.com',
  deadlineDate: 'Friday',
  trackingLink: 'https://keytrainlearning.com/phishing-sim/landing.html?theme=it_helpdesk',
  loginUrl: 'https://keytrainlearning.com/phishing-sim/landing.html?theme=it_helpdesk',
  pixelUrl: '',
}

function replaceToken(html: string, token: string, value: string): string {
  return html.split(token).join(value)
}

export function previewPhishingHtml(html: string): string {
  let out = html
  out = replaceToken(out, '{{FIRST_NAME}}', SAMPLE.firstName)
  out = replaceToken(out, '{{FULL_NAME}}', SAMPLE.fullName)
  out = replaceToken(out, '{{COMPANY_NAME}}', SAMPLE.companyName)
  out = replaceToken(out, '{{ORG_NAME}}', SAMPLE.companyName)
  out = replaceToken(out, '{{COMPANY_SLUG}}', SAMPLE.companySlug)
  out = replaceToken(out, '{{MANAGER_NAME}}', SAMPLE.managerName)
  out = replaceToken(out, '{{MANAGER_FIRST_NAME}}', SAMPLE.managerFirstName)
  out = replaceToken(out, '{{SENDER_NAME}}', SAMPLE.senderName)
  out = replaceToken(out, '{{SENDER_EMAIL}}', SAMPLE.senderEmail)
  out = replaceToken(out, '{{SENDER_EMAIL_LOCAL}}', SAMPLE.senderEmailLocal)
  out = replaceToken(out, '{{EMAIL_DOMAIN}}', SAMPLE.emailDomain)
  out = replaceToken(out, '{{DEADLINE_DATE}}', SAMPLE.deadlineDate)
  out = replaceToken(out, '{{TRACKING_LINK}}', SAMPLE.trackingLink)
  out = replaceToken(out, '{{LOGIN_URL}}', SAMPLE.loginUrl)
  out = replaceToken(out, '{{PIXEL_URL}}', SAMPLE.pixelUrl)
  out = replaceToken(out, '{{PIXEL}}', SAMPLE.pixelUrl)
  out = out.replace(/{{RANDOM_5_DIGITS}}/g, '48291')
  out = replaceToken(out, '{{CURRENT_QUARTER}}', 'Q2')
  return out
}

export function previewPhishingText(text: string): string {
  return previewPhishingHtml(text)
}

export function buildPhishingPreviewDocument(bodyHtml: string): string {
  const body = previewPhishingHtml(bodyHtml).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 12px; background: #f4f4f5; color: #18181b; }
    .wrap { max-width: 100%; margin: 0 auto; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    table { max-width: 100% !important; width: 100% !important; }
    td, th { word-break: break-word; }
    img { max-width: 100%; height: auto; }
    a { word-break: break-all; }
  </style>
</head>
<body><div class="wrap">${body}</div></body>
</html>`
}
