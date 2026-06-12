import type { Profile } from '@/types/user.types'

export function getProfileStatusBadge(profile: Profile): {
  label: string
  variant: 'success' | 'warning' | 'secondary' | 'destructive'
} {
  if (profile.login_locked_at) {
    return { label: 'Login locked', variant: 'destructive' }
  }
  if (!profile.is_active) {
    return { label: 'Inactive', variant: 'secondary' }
  }
  if (profile.invitation_pending) {
    return { label: 'Invitation sent', variant: 'warning' }
  }
  return { label: 'Active', variant: 'success' }
}
