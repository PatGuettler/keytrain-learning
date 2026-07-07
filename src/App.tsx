import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGuard } from '@/guards/AuthGuard'
import { PasswordPolicyGuard } from '@/guards/PasswordPolicyGuard'
import { RoleGuard } from '@/guards/RoleGuard'
import { RailNetGuard } from '@/guards/RailNetGuard'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { AcceptInvitePage } from '@/pages/auth/AcceptInvitePage'
import { UpdatePasswordRequiredPage } from '@/pages/auth/UpdatePasswordRequiredPage'
import { AdminDashboard } from '@/pages/dashboard/AdminDashboard'
import { HospitalDashboardPage } from '@/pages/dashboard/HospitalDashboardPage'
import { AdminOrgCourseDetailPage } from '@/pages/dashboard/AdminOrgCourseDetailPage'
import { CourseManagementPage } from '@/pages/admin/CourseManagementPage'
import { CourseEditPage } from '@/pages/admin/CourseEditPage'
import { OrganizationsPage } from '@/pages/admin/OrganizationsPage'
import { OrganizationDetailPage } from '@/pages/admin/OrganizationDetailPage'
import { PlatformAdminsPage } from '@/pages/admin/PlatformAdminsPage'
import { PlatformUsersPage } from '@/pages/admin/PlatformUsersPage'
import { UnlockRequestsPage } from '@/pages/admin/UnlockRequestsPage'
import { PrayerRequestsPage } from '@/pages/admin/PrayerRequestsPage'
import { AdminStaffTrainingPage } from '@/pages/admin/AdminStaffTrainingPage'
import { AdminStaffCourseDetailPage } from '@/pages/admin/AdminStaffCourseDetailPage'
import { EmployeeListPage } from '@/pages/manager/EmployeeListPage'
import { ManagerEmployeeDetailPage } from '@/pages/manager/ManagerEmployeeDetailPage'
import { MyTrainingPage } from '@/pages/employee/MyTrainingPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { PrayerPage } from '@/pages/PrayerPage'
import { PhishingTrainingPage } from '@/pages/phishing/PhishingTrainingPage'
import { PhishingCampaignsPage } from '@/pages/admin/PhishingCampaignsPage'
import { PhishingCampaignEditPage } from '@/pages/admin/PhishingCampaignEditPage'
import { PhishingCampaignDetailPage } from '@/pages/admin/PhishingCampaignDetailPage'
import { PhishingDashboardPage } from '@/pages/admin/PhishingDashboardPage'
import { RailNetPage } from '@/pages/admin/RailNetPage'
import { CoursePlayerPage } from '@/pages/training/CoursePlayerPage'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { HomePage } from '@/pages/marketing/HomePage'
import { PricingPage } from '@/pages/marketing/PricingPage'
import { ContactPage } from '@/pages/marketing/ContactPage'
import { SignupPage } from '@/pages/marketing/SignupPage'
import { JoinOrgPage } from '@/pages/marketing/JoinOrgPage'
import { useAuthStore } from '@/store/authStore'
import { ROLE_DASHBOARD } from '@/lib/constants'
import { getRouterBasename } from '@/lib/paths'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
})

function RootRoute() {
  const role = useAuthStore((s) => s.profile?.role)
  const userId = useAuthStore((s) => s.userId)
  if (userId && role) return <Navigate to={ROLE_DASHBOARD[role]} replace />
  return <HomePage />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={getRouterBasename()}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<RootRoute />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/join" element={<JoinOrgPage />} />
          </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/phishing-training" element={<PhishingTrainingPage />} />

          <Route element={<AuthGuard><Outlet /></AuthGuard>}>
            <Route path="/update-password-required" element={<UpdatePasswordRequiredPage />} />
            <Route element={<PasswordPolicyGuard><AppShell /></PasswordPolicyGuard>}>
            <Route
              path="/admin/dashboard"
              element={<RoleGuard roles={['admin']}><AdminDashboard /></RoleGuard>}
            />
            <Route
              path="/admin/dashboard/users"
              element={<RoleGuard roles={['admin']}><PlatformUsersPage /></RoleGuard>}
            />
            <Route
              path="/admin/dashboard/:orgSlug"
              element={<RoleGuard roles={['admin']}><HospitalDashboardPage /></RoleGuard>}
            />
            <Route
              path="/admin/dashboard/:orgSlug/courses/:courseId"
              element={<RoleGuard roles={['admin']}><AdminOrgCourseDetailPage /></RoleGuard>}
            />
            <Route
              path="/admin/dashboard/:orgSlug/staff/:userId"
              element={<RoleGuard roles={['admin']}><AdminStaffTrainingPage /></RoleGuard>}
            />
            <Route
              path="/admin/dashboard/:orgSlug/staff/:userId/courses/:courseId"
              element={<RoleGuard roles={['admin']}><AdminStaffCourseDetailPage /></RoleGuard>}
            />
            <Route
              path="/admin/courses/new"
              element={<Navigate to="/admin/courses/create" replace />}
            />
            <Route
              path="/admin/courses/new/edit"
              element={<Navigate to="/admin/courses/create" replace />}
            />
            <Route
              path="/admin/courses"
              element={
                <RoleGuard roles={['admin']}>
                  <Outlet />
                </RoleGuard>
              }
            >
              <Route index element={<CourseManagementPage />} />
              <Route path="create" element={<CourseEditPage />} />
              <Route path=":courseId/edit" element={<CourseEditPage />} />
            </Route>
            <Route
              path="/admin/unlock-requests"
              element={<RoleGuard roles={['admin']}><UnlockRequestsPage /></RoleGuard>}
            />
            <Route
              path="/admin/prayer-requests"
              element={<RoleGuard roles={['admin']}><PrayerRequestsPage /></RoleGuard>}
            />
            <Route
              path="/admin/hive"
              element={<Navigate to="/admin/railnet" replace />}
            />
            <Route
              path="/admin/railnet"
              element={
                <RoleGuard roles={['admin']}>
                  <RailNetGuard>
                    <RailNetPage />
                  </RailNetGuard>
                </RoleGuard>
              }
            />
            <Route
              path="/admin/phishing/campaigns"
              element={<RoleGuard roles={['admin']}><PhishingCampaignsPage /></RoleGuard>}
            />
            <Route
              path="/admin/phishing/campaigns/new"
              element={<Navigate to="/admin/phishing/campaigns/new/edit" replace />}
            />
            <Route
              path="/admin/phishing/campaigns/:campaignId/edit"
              element={<RoleGuard roles={['admin']}><PhishingCampaignEditPage /></RoleGuard>}
            />
            <Route
              path="/admin/phishing/campaigns/:campaignId"
              element={<RoleGuard roles={['admin']}><PhishingCampaignDetailPage /></RoleGuard>}
            />
            <Route
              path="/admin/phishing/dashboard"
              element={<RoleGuard roles={['admin']}><PhishingDashboardPage /></RoleGuard>}
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
              path="/admin/organizations/:orgSlug"
              element={<RoleGuard roles={['admin']}><OrganizationDetailPage /></RoleGuard>}
            />
            <Route path="/admin/users" element={<Navigate to="/admin/organizations" replace />} />

            <Route path="/manager/dashboard" element={<Navigate to="/manager/training" replace />} />
            <Route
              path="/manager/team"
              element={<RoleGuard roles={['manager']}><EmployeeListPage /></RoleGuard>}
            />
            <Route
              path="/manager/team/:employeeId"
              element={<RoleGuard roles={['manager']}><ManagerEmployeeDetailPage /></RoleGuard>}
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
                  <CoursePlayerPage trainingPath="/manager/training" />
                </RoleGuard>
              }
            />
            <Route
              path="/manager/railnet"
              element={
                <RoleGuard roles={['manager']}>
                  <RailNetGuard>
                    <RailNetPage />
                  </RailNetGuard>
                </RoleGuard>
              }
            />

            <Route path="/employee/dashboard" element={<Navigate to="/employee/training" replace />} />
            <Route
              path="/employee/training"
              element={<RoleGuard roles={['employee']}><MyTrainingPage /></RoleGuard>}
            />
            <Route
              path="/employee/training/play/:courseId"
              element={
                <RoleGuard roles={['employee']}>
                  <CoursePlayerPage trainingPath="/employee/training" />
                </RoleGuard>
              }
            />
            <Route
              path="/employee/railnet"
              element={
                <RoleGuard roles={['employee']}>
                  <RailNetGuard>
                    <RailNetPage />
                  </RailNetGuard>
                </RoleGuard>
              }
            />
            <Route path="/employee/profile" element={<RoleGuard roles={['employee', 'manager', 'admin']}><ProfilePage /></RoleGuard>} />
            <Route path="/manager/profile" element={<RoleGuard roles={['manager']}><ProfilePage /></RoleGuard>} />
            <Route path="/admin/profile" element={<RoleGuard roles={['admin']}><ProfilePage /></RoleGuard>} />
            <Route path="/employee/prayer" element={<RoleGuard roles={['employee', 'manager', 'admin']}><PrayerPage /></RoleGuard>} />
            <Route path="/manager/prayer" element={<RoleGuard roles={['manager']}><PrayerPage /></RoleGuard>} />
            <Route path="/admin/prayer" element={<RoleGuard roles={['admin']}><PrayerPage /></RoleGuard>} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
