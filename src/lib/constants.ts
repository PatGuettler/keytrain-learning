export const APP_NAME = 'GuardianMD'
export const HEARTBEAT_INTERVAL_MS = 30_000

export const DEMO_USERS = {
  admin: {
    email: 'admin@guardianmd.demo',
    password: 'demo-admin-123',
    role: 'admin' as const,
    fullName: 'Alex Rivera',
    id: 'a0000000-0000-0000-0000-000000000001',
  },
  manager: {
    email: 'manager@guardianmd.demo',
    password: 'demo-manager-123',
    role: 'manager' as const,
    fullName: 'Jordan Chen',
    id: 'a0000000-0000-0000-0000-000000000002',
  },
  employee: {
    email: 'employee@guardianmd.demo',
    password: 'demo-employee-123',
    role: 'employee' as const,
    fullName: 'Sam Taylor',
    id: 'a0000000-0000-0000-0000-000000000003',
  },
}

export const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001'

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
}

export const ROLE_DASHBOARD: Record<string, string> = {
  admin: '/admin/dashboard',
  manager: '/manager/dashboard',
  employee: '/employee/dashboard',
}
