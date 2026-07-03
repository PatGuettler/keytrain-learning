import { backend } from '@/backend'
import { PLATFORM_ORG_ID } from '@/lib/constants'
import type { Organization } from '@/types/user.types'

/** Hospital organizations (excludes the internal platform org). */
export async function fetchHospitalOrganizations() {
  const orgs = await backend.organizations.fetchOrganizations()
  return orgs.filter((o) => o.id !== PLATFORM_ORG_ID)
}

export async function fetchOrganizations() {
  return backend.organizations.fetchOrganizations()
}

export async function createOrganization(name: string) {
  return backend.organizations.createOrganization(name)
}

export async function updateOrganization(
  id: string,
  patch: { name?: string; hive_org_id?: string | null }
) {
  return backend.organizations.updateOrganization(id, patch)
}

export async function fetchOrganizationById(orgId: string): Promise<Organization | null> {
  const orgs = await backend.organizations.fetchOrganizations()
  return orgs.find((o) => o.id === orgId) ?? null
}

export async function deleteOrganization(id: string) {
  return backend.organizations.deleteOrganization(id)
}
