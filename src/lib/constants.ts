export const APP_NAME = 'GuardianMD'
export const HEARTBEAT_INTERVAL_MS = 30_000

/** Industry norm for healthcare apps: sign out after 15 minutes without interaction. */
export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000
export const SESSION_IDLE_TIMEOUT_MESSAGE =
  'You were signed out after 15 minutes of inactivity. Please sign in again.'

/** Dispatched during active training so long modules count as activity. */
export const SESSION_ACTIVITY_PULSE_EVENT = 'guardianmd:session-activity-pulse'

/** Internal org for platform admin accounts — hidden from the Hospitals list. */
export const PLATFORM_ORG_ID = '00000000-0000-0000-0000-000000000099'

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
}

/** Default landing route after login (admin-only analytics live under /admin/dashboard). */
export const ROLE_DASHBOARD: Record<string, string> = {
  admin: '/admin/dashboard',
  manager: '/manager/training',
  employee: '/employee/training',
}

export const ROLE_PROFILE: Record<string, string> = {
  admin: '/admin/profile',
  manager: '/manager/profile',
  employee: '/employee/profile',
}
