export const APP_NAME = 'GuardianMD'
export const HEARTBEAT_INTERVAL_MS = 30_000

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
