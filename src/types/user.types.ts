export type UserRole = 'admin' | 'manager' | 'employee'

export interface Profile {
  id: string
  org_id: string
  manager_id: string | null
  full_name: string
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  created_at: string
}
