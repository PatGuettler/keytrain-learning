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
  CreditCard,
  BarChart3,
} from 'lucide-react'
import type { UserRole } from '@/types/user.types'
import { SPIRITUAL_FEATURES_ENABLED } from '@/lib/spiritual-features'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Org users need RailNet license (+ personal grant for non-admins). */
  requiresRailnet?: boolean
  /** Org admin phishing add-on (paid). */
  requiresPhishing?: boolean
}

export const RAILNET_PATH_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin/railnet',
  org_admin: '/org-admin/railnet',
  manager: '/manager/railnet',
  employee: '/employee/railnet',
}

const adminNav: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/admins', label: 'Admins', icon: ShieldCheck },
  { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/railnet', label: 'RailNet', icon: Hexagon },
  { to: '/admin/phishing/campaigns', label: 'Phishing sims', icon: Fish },
  { to: '/admin/unlock-requests', label: 'Unlock requests', icon: LockKeyhole },
  ...(SPIRITUAL_FEATURES_ENABLED
    ? [{ to: '/admin/prayer-requests', label: 'Prayer requests', icon: HeartHandshake } satisfies NavItem]
    : []),
]

const orgAdminNav: NavItem[] = [
  { to: '/org-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/org-admin/organizations', label: 'Organizations', icon: Building2 },
  { to: '/org-admin/training-reports', label: 'Training reports', icon: BarChart3 },
  { to: '/org-admin/unlock-requests', label: 'Unlock requests', icon: LockKeyhole },
  { to: '/org-admin/billing', label: 'Billing', icon: CreditCard },
  { to: '/org-admin/railnet', label: 'RailNet', icon: Hexagon, requiresRailnet: true },
  { to: '/org-admin/phishing/campaigns', label: 'Phishing sims', icon: Fish, requiresPhishing: true },
]

export const navByRole: Record<UserRole, NavItem[]> = {
  admin: adminNav,
  org_admin: orgAdminNav,
  manager: [
    { to: '/manager/training', label: 'Required Training', icon: GraduationCap },
    { to: '/manager/training/history', label: 'Grade history', icon: BookOpen },
    { to: '/manager/reports', label: 'Training reports', icon: BarChart3 },
    { to: '/manager/team', label: 'My Team', icon: Users },
    { to: '/manager/railnet', label: 'RailNet', icon: Hexagon, requiresRailnet: true },
  ],
  employee: [
    { to: '/employee/training', label: 'Required Training', icon: GraduationCap },
    { to: '/employee/training/history', label: 'Grade history', icon: BookOpen },
    { to: '/employee/railnet', label: 'RailNet', icon: Hexagon, requiresRailnet: true },
  ],
}

export const mobileTabNavByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { to: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/admin/railnet', label: 'RailNet', icon: Hexagon },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/phishing/campaigns', label: 'Phishing', icon: Fish },
  ],
  org_admin: [
    { to: '/org-admin/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/org-admin/organizations', label: 'Orgs', icon: Building2 },
    { to: '/org-admin/training-reports', label: 'Reports', icon: BarChart3 },
    { to: '/org-admin/railnet', label: 'RailNet', icon: Hexagon, requiresRailnet: true },
  ],
  manager: [
    { to: '/manager/training', label: 'Training', icon: GraduationCap },
    { to: '/manager/reports', label: 'Reports', icon: BarChart3 },
    { to: '/manager/team', label: 'Team', icon: Users },
    { to: '/manager/railnet', label: 'RailNet', icon: Hexagon, requiresRailnet: true },
  ],
  employee: [
    { to: '/employee/training', label: 'Training', icon: GraduationCap },
    { to: '/employee/training/history', label: 'Grades', icon: BookOpen },
    { to: '/employee/railnet', label: 'RailNet', icon: Hexagon, requiresRailnet: true },
  ],
}
