import type { Profile } from '@/types/user.types'

export type ProfileStatusCategory = 'active' | 'invitation_pending' | 'inactive' | 'login_locked'

export function getProfileStatusCategory(profile: Profile): ProfileStatusCategory {
  if (profile.login_locked_at) return 'login_locked'
  if (!profile.is_active) return 'inactive'
  if (profile.invitation_pending) return 'invitation_pending'
  return 'active'
}

export function isProfileActive(profile: Profile): boolean {
  return getProfileStatusCategory(profile) === 'active'
}

export interface ProfileStatusCounts {
  active: number
  invitation_pending: number
  inactive: number
  login_locked: number
}

export function countProfileStatuses(profiles: Profile[]): ProfileStatusCounts {
  const counts: ProfileStatusCounts = {
    active: 0,
    invitation_pending: 0,
    inactive: 0,
    login_locked: 0,
  }
  for (const profile of profiles) {
    counts[getProfileStatusCategory(profile)]++
  }
  return counts
}

export function formatProfileStatusSubtitle(counts: ProfileStatusCounts): string {
  const parts = [`${counts.active} active`]
  if (counts.invitation_pending > 0) {
    parts.push(`${counts.invitation_pending} invited`)
  }
  if (counts.login_locked > 0) {
    parts.push(`${counts.login_locked} locked`)
  }
  parts.push(`${counts.inactive} inactive`)
  return parts.join(' · ')
}

export function getProfileStatusBadge(profile: Profile): {
  label: string
  variant: 'success' | 'warning' | 'secondary' | 'destructive'
} {
  switch (getProfileStatusCategory(profile)) {
    case 'login_locked':
      return { label: 'Login locked', variant: 'destructive' }
    case 'inactive':
      return { label: 'Inactive', variant: 'secondary' }
    case 'invitation_pending':
      return { label: 'Invitation sent', variant: 'warning' }
    case 'active':
      return { label: 'Active', variant: 'success' }
  }
}
