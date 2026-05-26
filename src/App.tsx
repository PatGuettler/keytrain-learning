import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGuard } from '@/guards/AuthGuard'
import { RoleGuard } from '@/guards/RoleGuard'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { AdminDashboard } from '@/pages/dashboard/AdminDashboard'
import { ManagerDashboard } from '@/pages/dashboard/ManagerDashboard'
import { EmployeeDashboard } from '@/pages/dashboard/EmployeeDashboard'
import { CourseManagementPage } from '@/pages/admin/CourseManagementPage'
import { CourseEditPage } from '@/pages/admin/CourseEditPage'
import { UserManagementPage } from '@/pages/admin/UserManagementPage'
import { EmployeeListPage } from '@/pages/manager/EmployeeListPage'
import { EmployeeDetailPage } from '@/pages/manager/EmployeeDetailPage'
import { AssignmentsPage } from '@/pages/manager/AssignmentsPage'
import { MyTrainingPage } from '@/pages/employee/MyTrainingPage'
import { ProfilePage } from '@/pages/employee/ProfilePage'
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
              path="/admin/courses"
              element={<RoleGuard roles={['admin']}><CourseManagementPage /></RoleGuard>}
            />
            <Route
              path="/admin/courses/:courseId/edit"
              element={<RoleGuard roles={['admin']}><CourseEditPage /></RoleGuard>}
            />
            <Route
              path="/admin/users"
              element={<RoleGuard roles={['admin']}><UserManagementPage /></RoleGuard>}
            />

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
            <Route
              path="/manager/assignments"
              element={<RoleGuard roles={['manager']}><AssignmentsPage /></RoleGuard>}
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
              element={<RoleGuard roles={['employee']}><CoursePlayerPage dashboardPath="/employee/dashboard" /></RoleGuard>}
            />
            <Route
              path="/employee/profile"
              element={<RoleGuard roles={['employee']}><ProfilePage /></RoleGuard>}
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
