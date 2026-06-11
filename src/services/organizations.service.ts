import { backend } from '@/backend'
import { PLATFORM_ORG_ID } from '@/lib/constants'
import { deleteOrganizationById } from '@/services/user-management.service'
import type { Organization } from '@/types/user.types'

export async function fetchOrganizations() {
  return backend.organizations.fetchOrganizations()
}

/** Hospital orgs only — excludes the internal platform admin org. */
export async function fetchHospitalOrganizations(): Promise<Organization[]> {
  const orgs = await fetchOrganizations()
  return orgs.filter((o) => o.id !== PLATFORM_ORG_ID)
}

export async function createOrganization(name: string) {
  return backend.organizations.createOrganization(name)
}

export async function updateOrganization(id: string, name: string) {
  return backend.organizations.updateOrganization(id, { name })
}

function isEdgeFunctionUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('FunctionsRelayError') ||
    message.includes('FunctionsFetchError')
  )
}

export async function deleteOrganization(id: string) {
  if (id === PLATFORM_ORG_ID) {
    throw new Error('The platform administration organization cannot be deleted.')
  }

  try {
    await backend.organizations.deleteOrganization(id)
    return
  } catch (directError) {
    try {
      await deleteOrganizationById(id)
    } catch (edgeError) {
      if (isEdgeFunctionUnavailable(edgeError)) {
        throw directError instanceof Error
          ? directError
          : new Error(
              'Could not delete organization. Run supabase/migrations/003_org_admin_delete.sql in the Supabase SQL Editor.'
            )
      }
      throw edgeError instanceof Error ? edgeError : new Error(String(edgeError))
    }
  }
}
