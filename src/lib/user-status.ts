import type { Profile } from '@/types/user.types'

export function getProfileStatusBadge(profile: Profile): {
  label: string
  variant: 'success' | 'warning' | 'secondary'
} {
  if (!profile.is_active) {
    return { label: 'Inactive', variant: 'secondary' }
  }
  if (profile.invitation_pending) {
    return { label: 'Invitation sent', variant: 'warning' }
  }
  return { label: 'Active', variant: 'success' }
}
