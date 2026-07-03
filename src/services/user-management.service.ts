import { getEdgeFunctionAccessToken } from '@/lib/edge-function-auth'
import { getInviteRedirectUrl, getResetPasswordRedirectUrl } from '@/lib/backend-config'
import { PLATFORM_ORG_ID } from '@/lib/constants'
import { EDGE_FUNCTION_DEPLOY_HINT, isEdgeFunctionUnavailable } from '@/lib/edge-functions'
import { getSupabase, getSupabaseAnonKey, getSupabaseUrl } from '@/services/supabase'
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

function manageUsersDeployError(cause?: unknown): Error {
  if (cause instanceof Error && !isEdgeFunctionUnavailable(cause)) {
    return new Error(`${EDGE_FUNCTION_DEPLOY_HINT}\n\n(${cause.message})`)
  }
  return new Error(EDGE_FUNCTION_DEPLOY_HINT)
}

async function invokeManageUsers<T>(body: Record<string, unknown>): Promise<T> {
  const supabase = getSupabase()
  const baseUrl = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!supabase || !baseUrl || !anonKey) throw new Error('Supabase is not configured.')

  const inviteActions = new Set(['invite_one', 'import_csv', 'invite_platform_admin'])
  const securityActions = new Set(['send_password_reset'])
  const payload = inviteActions.has(String(body.action))
    ? { ...body, redirect_to: getInviteRedirectUrl() }
    : securityActions.has(String(body.action))
      ? { ...body, redirect_to: getResetPasswordRedirectUrl() }
      : { ...body }

  const accessToken = await getEdgeFunctionAccessToken()

  let response: Response
  try {
    response = await fetch(`${baseUrl}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw manageUsersDeployError()
  }

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string; code?: string; message?: string })
    | { error?: string; code?: string; message?: string }
    | null

  // A JSON `error` body means the function executed and returned a real error.
  // Only treat 404/401 as "not deployed" when there's no such body (true gateway miss).
  const bodyError =
    data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
      ? data.error
      : null

  const gatewayNotDeployed =
    (response.status === 404 || response.status === 401) && !bodyError

  const codeNotFound =
    data &&
    typeof data === 'object' &&
    'code' in data &&
    (data as { code?: string }).code === 'NOT_FOUND'

  if (gatewayNotDeployed || codeNotFound) {
    throw manageUsersDeployError()
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : data &&
            typeof data === 'object' &&
            'message' in data &&
            typeof data.message === 'string'
          ? data.message
          : `Request failed (${response.status}).`
    if (response.status === 0 || message.includes('Failed to fetch')) {
      throw manageUsersDeployError()
    }
    throw new Error(message)
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request failed.')
  }

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
    railnet_enabled?: boolean
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

export async function deletePlatformAdmin(userId: string): Promise<void> {
  await invokeManageUsers({
    action: 'delete_platform_admin',
    user_id: userId,
  })
}

export async function deleteOrgUser(orgId: string, userId: string): Promise<void> {
  await invokeManageUsers({ action: 'delete_org_user', org_id: orgId, user_id: userId })
}


export async function sendUserPasswordReset(
  orgId: string,
  userId: string
): Promise<{ message: string }> {
  return invokeManageUsers({
    action: 'send_password_reset',
    org_id: orgId,
    user_id: userId,
  })
}

export async function sendPlatformAdminPasswordReset(userId: string): Promise<{ message: string }> {
  return sendUserPasswordReset(PLATFORM_ORG_ID, userId)
}

export async function unlockUserLogin(orgId: string, userId: string): Promise<{ message: string }> {
  return invokeManageUsers({
    action: 'unlock_user_login',
    org_id: orgId,
    user_id: userId,
  })
}
