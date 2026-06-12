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
  created_at: string
  updated_at: string
}

export type AdminProfileUpdate = Partial<
  Pick<Profile, 'full_name' | 'avatar_url' | 'role' | 'manager_id' | 'is_active' | 'invitation_pending'>
>

export interface Organization {
  id: string
  name: string
  created_at: string
}
