import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  LayoutDashboard,
  Building2,
  GraduationCap,
  ShieldCheck,
  Users,
  LockKeyhole,
  Fish,
  HeartHandshake,
  Hexagon,
} from 'lucide-react'
import type { UserRole } from '@/types/user.types'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Org users need RailNet granted on their profile; KTL admins always see this item. */
  requiresRailnet?: boolean
}

export const RAILNET_PATH_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin/hive',
  manager: '/manager/railnet',
  employee: '/employee/railnet',
}

export const navByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/admins', label: 'Admins', icon: ShieldCheck },
    { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/hive', label: 'RailNet', icon: Hexagon },
    { to: '/admin/phishing/campaigns', label: 'Phishing sims', icon: Fish },
    { to: '/admin/unlock-requests', label: 'Unlock requests', icon: LockKeyhole },
    { to: '/admin/prayer-requests', label: 'Prayer requests', icon: HeartHandshake },
  ],
  manager: [
    { to: '/manager/training', label: 'Required Training', icon: GraduationCap },
    { to: '/manager/team', label: 'My Team', icon: Users },
    { to: '/manager/railnet', label: 'RailNet', icon: Hexagon, requiresRailnet: true },
  ],
  employee: [
    { to: '/employee/training', label: 'Required Training', icon: GraduationCap },
    { to: '/employee/railnet', label: 'RailNet', icon: Hexagon, requiresRailnet: true },
  ],
}

export const mobileTabNavByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { to: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/phishing/campaigns', label: 'Phishing', icon: Fish },
  ],
  manager: [
    { to: '/manager/training', label: 'Training', icon: GraduationCap },
    { to: '/manager/team', label: 'Team', icon: Users },
  ],
  employee: [{ to: '/employee/training', label: 'Training', icon: GraduationCap }],
}
