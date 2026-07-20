export type UserAdminTab = 'profile' | 'training'

export function adminUserPath(userId: string, tab?: UserAdminTab): string {
  const base = `/admin/users/${userId}`
  return tab ? `${base}?tab=${tab}` : base
}

export function orgAdminUserPath(userId: string, tab?: UserAdminTab): string {
  const base = `/org-admin/users/${userId}`
  return tab ? `${base}?tab=${tab}` : base
}
