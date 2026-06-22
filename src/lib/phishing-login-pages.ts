import { getPublicAppUrl } from '@/lib/backend-config'
import type { PhishingPretext } from '@/types/phishing.types'

/** Bundled fake login pages under /phishing-sim/ — one theme per template pretext. */
export const PHISHING_LOGIN_PAGE_BY_PRETEXT: Record<PhishingPretext, string> = {
  it_helpdesk: '/phishing-sim/landing.html?theme=it_helpdesk',
  docusign: '/phishing-sim/landing.html?theme=docusign',
  executive: '/phishing-sim/landing.html?theme=sharepoint',
  hr: '/phishing-sim/landing.html?theme=hr',
  microsoft: '/phishing-sim/landing.html?theme=microsoft',
  payroll: '/phishing-sim/landing.html?theme=payroll',
}

export const PHISHING_LOGIN_PAGE_LABELS: Record<PhishingPretext, string> = {
  it_helpdesk: 'IT password reset portal',
  docusign: 'DocuSign document review',
  executive: 'SharePoint sign-in',
  hr: 'HR benefits enrollment',
  microsoft: 'Microsoft account sign-in',
  payroll: 'Payroll direct deposit verification',
}

export function getFakeLoginUrlForPretext(pretext: string): string {
  const base = getPublicAppUrl().replace(/\/$/, '')
  const path =
    pretext in PHISHING_LOGIN_PAGE_BY_PRETEXT
      ? PHISHING_LOGIN_PAGE_BY_PRETEXT[pretext as PhishingPretext]
      : '/phishing-sim/login.html'
  return `${base}${path}`
}
