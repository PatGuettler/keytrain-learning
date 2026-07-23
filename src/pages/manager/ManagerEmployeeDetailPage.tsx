import { ManagerStaffTrainingPage } from '@/pages/manager/ManagerStaffTrainingPage'

/** My Team drill-down — same training report as manager reports, different back link. */
export function ManagerEmployeeDetailPage() {
  return (
    <ManagerStaffTrainingPage
      backPath="/manager/team"
      backLabel="My Team"
      courseDetailPathPrefix="/manager/reports/staff"
    />
  )
}
