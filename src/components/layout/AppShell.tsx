import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { isTrainingPlayerPath } from '@/lib/training-paths'
import { NewCourseNoticeModal } from '@/components/training/NewCourseNoticeModal'
import { useNewCourseNotices } from '@/hooks/useNewCourseNotices'
import { useRequiredAssignmentSync } from '@/hooks/useRequiredAssignmentSync'
import { useAuthStore } from '@/store/authStore'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { MobileSidebar } from './MobileSidebar'

export function AppShell() {
  const location = useLocation()
  const role = useAuthStore((s) => s.profile?.role)
  const { notices, dismissNotice, enabled } = useNewCourseNotices()
  useRequiredAssignmentSync()
  const inTrainingPlayer = isTrainingPlayerPath(location.pathname)

  return (
    <div className="flex min-h-dvh w-full max-w-[100vw] overflow-x-hidden">
      {enabled && role && role !== 'admin' && (
        <NewCourseNoticeModal notices={notices} role={role} onDismiss={dismissNotice} />
      )}
      <Sidebar />
      <MobileSidebar />
      <div className={cn('flex min-w-0 flex-1 flex-col lg:pb-0', !inTrainingPlayer && 'pb-mobile-nav')}>
        <Topbar />
        <main
          className={cn(
            'flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6 safe-area-px',
            inTrainingPlayer && 'pb-0'
          )}
        >
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
