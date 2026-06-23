export interface PhishingRecipientContext {
  firstName: string
  fullName: string
  companyName: string
  companySlug: string
  managerName: string
  managerFirstName: string
  senderName: string
  senderEmail: string
  senderEmailLocal: string
  emailDomain: string
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

export function slugifyCompanyName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'organization'
  )
}

export function phishingEmailDomain(): string {
  return Deno.env.get('PHISHING_EMAIL_DOMAIN') ?? 'keytrainlearning.com'
}

/** Strip placeholder tokens from stored sender local part (e.g. "{{COMPANY_SLUG}}-hr-benefits" → "hr-benefits"). */
export function extractSenderEmailLocal(stored: string): string {
  const part = stored.split('@')[0]?.trim() ?? 'noreply'
  return part.replace(/\{\{[^}]+\}\}-?/g, '').replace(/^-+/, '') || 'noreply'
}

export function buildOrgSenderEmail(
  companySlug: string,
  localPart: string,
  domain: string
): string {
  const local = extractSenderEmailLocal(localPart)
  return `${companySlug}-${local}@${domain}`
}

export function replacePhishingPlaceholders(
  template: string,
  ctx: PhishingRecipientContext
): string {
  return template
    .replaceAll('{{FIRST_NAME}}', ctx.firstName)
    .replaceAll('{{FULL_NAME}}', ctx.fullName)
    .replaceAll('{{COMPANY_NAME}}', ctx.companyName)
    .replaceAll('{{ORG_NAME}}', ctx.companyName)
    .replaceAll('{{COMPANY_SLUG}}', ctx.companySlug)
    .replaceAll('{{MANAGER_NAME}}', ctx.managerName)
    .replaceAll('{{MANAGER_FIRST_NAME}}', ctx.managerFirstName)
    .replaceAll('{{SENDER_NAME}}', ctx.senderName)
    .replaceAll('{{SENDER_EMAIL}}', ctx.senderEmail)
    .replaceAll('{{SENDER_EMAIL_LOCAL}}', ctx.senderEmailLocal)
    .replaceAll('{{EMAIL_DOMAIN}}', ctx.emailDomain)
    .replaceAll('{{DEADLINE_DATE}}', ctx.deadlineDate)
    .replaceAll('{{TRACKING_LINK}}', ctx.trackingLink)
    .replaceAll('{{LOGIN_URL}}', ctx.loginUrl)
    .replaceAll('{{PIXEL_URL}}', ctx.pixelUrl)
    .replaceAll('{{PIXEL}}', ctx.pixelUrl)
    .replaceAll(/{{RANDOM_5_DIGITS}}/g, () => String(Math.floor(10000 + Math.random() * 90000)))
    .replaceAll('{{CURRENT_QUARTER}}', `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`)
}

export function resolveCampaignSenderEmail(
  campaignSenderEmail: string,
  ctx: PhishingRecipientContext
): string {
  if (campaignSenderEmail.includes('{{')) {
    return replacePhishingPlaceholders(campaignSenderEmail, ctx)
  }
  const local = extractSenderEmailLocal(campaignSenderEmail)
  return buildOrgSenderEmail(ctx.companySlug, local, ctx.emailDomain)
}

export function isPhishingDryRun(): boolean {
  if (Deno.env.get('PHISHING_SIMULATION_DRY_RUN') === 'true') return true
  const key = Deno.env.get('RESEND_API_KEY')?.trim()
  return !key
}

export function parseResendError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string }
    return parsed.message ?? body
  } catch {
    return body
  }
}

export function trackingBaseUrl(supabaseUrl: string): string {
  const custom = Deno.env.get('PHISHING_TRACKING_BASE_URL')
  if (custom) return custom.replace(/\/$/, '')
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/track-phishing-event`
}

export function trainingPageUrl(): string {
  const custom = Deno.env.get('PHISHING_TRAINING_URL')
  if (custom) return custom
  return 'https://keytrainlearning.com/phishing-training'
}

/** Allowed redirect targets after a tracked click (fake login pages). */
export function isAllowedPhishingRedirect(target: string): boolean {
  try {
    const parsed = new URL(target)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true
    if (parsed.hostname === 'keytrainlearning.com' || parsed.hostname.endsWith('.keytrainlearning.com')) {
      return true
    }
    return false
  } catch {
    return false
  }
}

export function buildRecipientContext(params: {
  profile: { full_name: string; org_id: string | null; manager_id: string | null }
  orgNameById: Map<string, string>
  managerNameById: Map<string, string>
  campaignOrgName: string | null
  campaignSenderName: string
  campaignSenderEmail: string
  deadlineDate: string
  trackingLink: string
  loginUrl: string
  pixelUrl: string
}): PhishingRecipientContext {
  const {
    profile,
    orgNameById,
    managerNameById,
    campaignOrgName,
    campaignSenderName,
    campaignSenderEmail,
    deadlineDate,
    trackingLink,
    loginUrl,
    pixelUrl,
  } = params

  const companyName =
    (profile.org_id ? orgNameById.get(profile.org_id) : null) ??
    campaignOrgName ??
    'Your Organization'
  const companySlug = slugifyCompanyName(companyName)
  const emailDomain = phishingEmailDomain()
  const senderLocalPart = extractSenderEmailLocal(campaignSenderEmail)
  const senderEmail = buildOrgSenderEmail(companySlug, senderLocalPart, emailDomain)
  const senderEmailLocal = senderEmail.split('@')[0] ?? senderLocalPart
  const managerName = profile.manager_id
    ? managerNameById.get(profile.manager_id) ?? 'Your manager'
    : 'Your manager'

  const base: PhishingRecipientContext = {
    firstName: firstNameFromFullName(profile.full_name),
    fullName: profile.full_name,
    companyName,
    companySlug,
    managerName,
    managerFirstName: firstNameFromFullName(managerName),
    senderName: campaignSenderName,
    senderEmail,
    senderEmailLocal,
    emailDomain,
    deadlineDate,
    trackingLink,
    loginUrl,
    pixelUrl,
  }

  return {
    ...base,
    senderName: replacePhishingPlaceholders(campaignSenderName, base),
  }
}
