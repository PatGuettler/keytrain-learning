import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGuard } from '@/guards/AuthGuard'
import { RoleGuard } from '@/guards/RoleGuard'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { AdminDashboard } from '@/pages/dashboard/AdminDashboard'
import { HospitalDashboardPage } from '@/pages/dashboard/HospitalDashboardPage'
import { ManagerDashboard } from '@/pages/dashboard/ManagerDashboard'
import { EmployeeDashboard } from '@/pages/dashboard/EmployeeDashboard'
import { CourseManagementPage } from '@/pages/admin/CourseManagementPage'
import { CourseEditPage } from '@/pages/admin/CourseEditPage'
import { OrganizationsPage } from '@/pages/admin/OrganizationsPage'
import { OrganizationDetailPage } from '@/pages/admin/OrganizationDetailPage'
import { PlatformAdminsPage } from '@/pages/admin/PlatformAdminsPage'
import { UnlockRequestsPage } from '@/pages/admin/UnlockRequestsPage'
import { EmployeeListPage } from '@/pages/manager/EmployeeListPage'
import { EmployeeDetailPage } from '@/pages/manager/EmployeeDetailPage'
import { MyTrainingPage } from '@/pages/employee/MyTrainingPage'
import { CoursePlayerPage } from '@/pages/training/CoursePlayerPage'
import { useAuthStore } from '@/store/authStore'
import { ROLE_DASHBOARD } from '@/lib/constants'
import { getRouterBasename } from '@/lib/paths'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

function HomeRedirect() {
  const role = useAuthStore((s) => s.profile?.role)
  const userId = useAuthStore((s) => s.userId)
  if (!userId) return <Navigate to="/login" replace />
  if (role) return <Navigate to={ROLE_DASHBOARD[role]} replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={getRouterBasename()}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/" element={<HomeRedirect />} />

          <Route element={<AuthGuard><AppShell /></AuthGuard>}>
            <Route
              path="/admin/dashboard"
              element={<RoleGuard roles={['admin']}><AdminDashboard /></RoleGuard>}
            />
            <Route
              path="/admin/dashboard/:orgId"
              element={<RoleGuard roles={['admin']}><HospitalDashboardPage /></RoleGuard>}
            />
            <Route
              path="/admin/courses"
              element={<RoleGuard roles={['admin']}><CourseManagementPage /></RoleGuard>}
            />
            <Route
              path="/admin/courses/:courseId/edit"
              element={<RoleGuard roles={['admin']}><CourseEditPage /></RoleGuard>}
            />
            <Route
              path="/admin/unlock-requests"
              element={<RoleGuard roles={['admin']}><UnlockRequestsPage /></RoleGuard>}
            />
            <Route
              path="/admin/admins"
              element={<RoleGuard roles={['admin']}><PlatformAdminsPage /></RoleGuard>}
            />
            <Route
              path="/admin/organizations"
              element={<RoleGuard roles={['admin']}><OrganizationsPage /></RoleGuard>}
            />
            <Route
              path="/admin/organizations/:orgId"
              element={<RoleGuard roles={['admin']}><OrganizationDetailPage /></RoleGuard>}
            />
            <Route path="/admin/users" element={<Navigate to="/admin/organizations" replace />} />

            <Route
              path="/manager/dashboard"
              element={<RoleGuard roles={['manager']}><ManagerDashboard /></RoleGuard>}
            />
            <Route
              path="/manager/team"
              element={<RoleGuard roles={['manager']}><EmployeeListPage /></RoleGuard>}
            />
            <Route
              path="/manager/team/:employeeId"
              element={<RoleGuard roles={['manager']}><EmployeeDetailPage /></RoleGuard>}
            />
            <Route path="/manager/assignments" element={<Navigate to="/manager/training" replace />} />
            <Route
              path="/manager/training"
              element={<RoleGuard roles={['manager']}><MyTrainingPage basePath="/manager/training" /></RoleGuard>}
            />
            <Route
              path="/manager/training/play/:courseId"
              element={
                <RoleGuard roles={['manager']}>
                  <CoursePlayerPage
                    dashboardPath="/manager/dashboard"
                    trainingPath="/manager/training"
                  />
                </RoleGuard>
              }
            />

            <Route
              path="/employee/dashboard"
              element={<RoleGuard roles={['employee']}><EmployeeDashboard /></RoleGuard>}
            />
            <Route
              path="/employee/training"
              element={<RoleGuard roles={['employee']}><MyTrainingPage /></RoleGuard>}
            />
            <Route
              path="/employee/training/play/:courseId"
              element={
                <RoleGuard roles={['employee']}>
                  <CoursePlayerPage
                    dashboardPath="/employee/dashboard"
                    trainingPath="/employee/training"
                  />
                </RoleGuard>
              }
            />
            <Route path="/employee/profile" element={<Navigate to="/employee/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
