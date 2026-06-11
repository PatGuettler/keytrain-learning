import { Outlet } from 'react-router-dom'
import { NewCourseNoticeModal } from '@/components/training/NewCourseNoticeModal'
import { useNewCourseNotices } from '@/hooks/useNewCourseNotices'
import { useRequiredAssignmentSync } from '@/hooks/useRequiredAssignmentSync'
import { useAuthStore } from '@/store/authStore'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { MobileSidebar } from './MobileSidebar'

export function AppShell() {
  const role = useAuthStore((s) => s.profile?.role)
  const { notices, dismissNotice, enabled } = useNewCourseNotices()
  useRequiredAssignmentSync()

  return (
    <div className="flex min-h-dvh w-full max-w-[100vw] overflow-x-hidden">
      {enabled && role && role !== 'admin' && (
        <NewCourseNoticeModal notices={notices} role={role} onDismiss={dismissNotice} />
      )}
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-mobile-nav lg:pb-0">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6 safe-area-px">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
