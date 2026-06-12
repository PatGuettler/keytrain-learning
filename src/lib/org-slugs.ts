import type { Organization } from '@/types/user.types'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isOrgUuid(value: string): boolean {
  return UUID_RE.test(value)
}

/** URL-safe slug from organization name. */
export function slugifyOrgName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'organization'
}

export interface OrgSlugLookup {
  slugById: Map<string, string>
  orgBySlug: Map<string, Organization>
}

/** Assign unique slugs; duplicate names get -2, -3, … suffixes. */
export function buildOrgSlugLookup(orgs: Organization[]): OrgSlugLookup {
  const slugById = new Map<string, string>()
  const orgBySlug = new Map<string, Organization>()
  const baseCounts = new Map<string, number>()

  const sorted = [...orgs].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  )

  for (const org of sorted) {
    const base = slugifyOrgName(org.name)
    const seen = baseCounts.get(base) ?? 0
    baseCounts.set(base, seen + 1)
    const slug = seen === 0 ? base : `${base}-${seen + 1}`
    slugById.set(org.id, slug)
    orgBySlug.set(slug, org)
  }

  return { slugById, orgBySlug }
}

export function getOrgSlug(org: Organization, orgs: Organization[]): string {
  return buildOrgSlugLookup(orgs).slugById.get(org.id) ?? slugifyOrgName(org.name)
}

export function resolveOrgFromParam(
  param: string,
  orgs: Organization[]
): Organization | undefined {
  if (isOrgUuid(param)) {
    return orgs.find((o) => o.id === param)
  }
  return buildOrgSlugLookup(orgs).orgBySlug.get(param)
}

export function adminOrganizationPath(slug: string): string {
  return `/admin/organizations/${slug}`
}

export function adminOrgDashboardPath(slug: string, ...segments: string[]): string {
  const tail = segments.filter(Boolean).join('/')
  return tail ? `/admin/dashboard/${slug}/${tail}` : `/admin/dashboard/${slug}`
}
