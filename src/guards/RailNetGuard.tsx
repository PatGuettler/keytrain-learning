import { Navigate } from 'react-router-dom'
import { useRailnetAccess } from '@/hooks/useRailnetAccess'

export function RailNetGuard({ children }: { children: React.ReactNode }) {
  const { canAccessRailnet, isLoading } = useRailnetAccess()

  if (isLoading) return null
  if (!canAccessRailnet) return <Navigate to="/admin/dashboard" replace />
  return <>{children}</>
}
