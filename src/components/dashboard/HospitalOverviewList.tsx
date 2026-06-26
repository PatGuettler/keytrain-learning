import { Link } from 'react-router-dom'
import { Building2, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getOrgSlug } from '@/lib/org-slugs'
import type { HospitalDashboardSummary } from '@/hooks/useAdminDashboard'

export function HospitalOverviewList({
  hospitals,
  isLoading,
}: {
  hospitals: HospitalDashboardSummary[]
  isLoading?: boolean
}) {
  const orgs = hospitals.map((h) => h.org)
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading organizations…</p>
  }

  if (hospitals.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No organizations yet. Create one to start tracking training.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organizations</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <ul className="divide-y">
          {hospitals.map(({ org, userCount, totalCourses, publishedCourses, completionRate, overdueCount }) => (
            <li key={org.id}>
              <Link
                to={`/admin/dashboard/${getOrgSlug(org, orgs)}`}
                className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{org.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {userCount} user{userCount === 1 ? '' : 's'} · {publishedCourses}/{totalCourses} courses
                      published · {completionRate}% completion
                      {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
