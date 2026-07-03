export type UserRole = 'admin' | 'manager' | 'employee'

export interface Profile {
  id: string
  org_id: string
  manager_id: string | null
  full_name: string
  email: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  invitation_pending: boolean
  password_upgrade_required: boolean
  failed_login_attempts: number
  login_locked_at: string | null
  last_login_at: string | null
  daily_verse_enabled: boolean
  railnet_enabled?: boolean
  created_at: string
  updated_at: string
}

export type UserPreferencesUpdate = Partial<Pick<Profile, 'daily_verse_enabled'>>

export type AdminProfileUpdate = Partial<
  Pick<
    Profile,
    | 'full_name'
    | 'avatar_url'
    | 'role'
    | 'manager_id'
    | 'is_active'
    | 'invitation_pending'
    | 'password_upgrade_required'
    | 'failed_login_attempts'
    | 'login_locked_at'
    | 'railnet_enabled'
  >
>

export interface Organization {
  id: string
  name: string
  hive_org_id?: string | null
  created_at: string
}
