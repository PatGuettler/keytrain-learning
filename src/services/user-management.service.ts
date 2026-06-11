import { absoluteAppUrl } from '@/lib/paths'
import { isEdgeFunctionUnavailable } from '@/lib/edge-functions'
import { getSupabase } from '@/services/supabase'
import { updateProfile } from '@/services/users.service'
import type { Profile, UserRole } from '@/types/user.types'

export interface ImportUserRowResult {
  email: string
  status: 'invited' | 'created' | 'skipped' | 'error'
  message?: string
}

export interface ImportUsersResult {
  summary: {
    total: number
    invited: number
    created: number
    skipped: number
    failed: number
  }
  rows: ImportUserRowResult[]
}

async function invokeManageUsers<T>(body: Record<string, unknown>): Promise<T> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase.functions.invoke('manage-users', {
    body: {
      ...body,
      redirect_to: absoluteAppUrl('login'),
    },
  })

  if (error) throw new Error(error.message || 'Request failed.')
  if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'Request failed.')
  return data as T
}

export async function importUsersFromCsv(
  orgId: string,
  csv: string,
  sendInvites: boolean
): Promise<ImportUsersResult> {
  return invokeManageUsers({
    action: 'import_csv',
    org_id: orgId,
    csv,
    send_invites: sendInvites,
  })
}

export async function inviteOrgUser(
  orgId: string,
  payload: {
    email: string
    full_name?: string
    role?: UserRole
    manager_email?: string
    send_invites?: boolean
  }
): Promise<ImportUserRowResult> {
  const data = await invokeManageUsers<{ row: ImportUserRowResult }>({
    action: 'invite_one',
    org_id: orgId,
    email: payload.email,
    full_name: payload.full_name,
    role: payload.role ?? 'employee',
    manager_email: payload.manager_email,
    send_invites: payload.send_invites !== false,
  })
  return data.row
}

export async function invitePlatformAdmin(payload: {
  email: string
  full_name?: string
  send_invites?: boolean
}): Promise<ImportUserRowResult> {
  const data = await invokeManageUsers<{ row: ImportUserRowResult }>({
    action: 'invite_platform_admin',
    email: payload.email,
    full_name: payload.full_name,
    send_invites: payload.send_invites !== false,
  })
  return data.row
}

export async function updateOrgUser(
  orgId: string,
  userId: string,
  patch: {
    role?: UserRole
    full_name?: string
    manager_id?: string | null
    is_active?: boolean
  }
): Promise<Profile> {
  if (patch.role === 'admin') {
    throw new Error('Cannot assign platform admin role from an organization.')
  }

  const normalizedPatch = { ...patch }
  if (normalizedPatch.role === 'manager') {
    normalizedPatch.manager_id = null
  }

  try {
    const data = await invokeManageUsers<{ profile: Profile }>({
      action: 'update_user',
      org_id: orgId,
      user_id: userId,
      ...normalizedPatch,
    })
    return data.profile
  } catch (edgeError) {
    if (!isEdgeFunctionUnavailable(edgeError)) throw edgeError

    const profile = await updateProfile(userId, normalizedPatch)
    if (profile.org_id !== orgId) {
      throw new Error('User not in this organization.')
    }
    if (profile.role === 'admin') {
      throw new Error('Cannot update platform admin accounts from organization settings.')
    }
    return profile
  }
}

export async function deleteOrganizationById(orgId: string): Promise<void> {
  await invokeManageUsers({ action: 'delete_organization', org_id: orgId })
}
