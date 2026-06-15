export interface PhishingRecipientContext {
  firstName: string
  fullName: string
  companyName: string
  managerName: string
  senderName: string
  deadlineDate: string
  trackingLink: string
  loginUrl: string
  pixelUrl: string
}

export function firstNameFromFullName(fullName: string): string {
  const trimmed = fullName.trim()
  if (!trimmed) return 'Colleague'
  return trimmed.split(/\s+/)[0] ?? trimmed
}

export function replacePhishingPlaceholders(
  template: string,
  ctx: PhishingRecipientContext
): string {
  return template
    .replaceAll('{{FIRST_NAME}}', ctx.firstName)
    .replaceAll('{{FULL_NAME}}', ctx.fullName)
    .replaceAll('{{COMPANY_NAME}}', ctx.companyName)
    .replaceAll('{{MANAGER_NAME}}', ctx.managerName)
    .replaceAll('{{SENDER_NAME}}', ctx.senderName)
    .replaceAll('{{DEADLINE_DATE}}', ctx.deadlineDate)
    .replaceAll('{{TRACKING_LINK}}', ctx.trackingLink)
    .replaceAll('{{LOGIN_URL}}', ctx.loginUrl)
    .replaceAll('{{PIXEL_URL}}', ctx.pixelUrl)
    .replaceAll('{{PIXEL}}', ctx.pixelUrl)
    .replaceAll(/{{RANDOM_5_DIGITS}}/g, () => String(Math.floor(10000 + Math.random() * 90000)))
    .replaceAll('{{CURRENT_QUARTER}}', `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`)
}

export function isPhishingDryRun(): boolean {
  if (Deno.env.get('PHISHING_SIMULATION_DRY_RUN') === 'true') return true
  return !Deno.env.get('RESEND_API_KEY')
}

export function trackingBaseUrl(supabaseUrl: string): string {
  const custom = Deno.env.get('PHISHING_TRACKING_BASE_URL')
  if (custom) return custom.replace(/\/$/, '')
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/track-phishing-event`
}

export function trainingPageUrl(): string {
  const custom = Deno.env.get('PHISHING_TRAINING_URL')
  if (custom) return custom
  return 'https://patguettler.github.io/guardian-md/phishing-training'
}
