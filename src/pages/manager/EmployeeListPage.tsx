import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchProfiles } from '@/services/users.service'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getProfileStatusBadge } from '@/lib/user-status'
import { PageHeader } from '@/components/layout/PageHeader'

export function EmployeeListPage() {
  const userId = useAuthStore((s) => s.userId)
  const { data: team = [] } = useQuery({
    queryKey: ['team', userId],
    queryFn: () => fetchProfiles({ managerId: userId! }),
    enabled: Boolean(userId),
  })

  const employees = team.filter((p) => p.role === 'employee')

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="My Team"
        description="Team roster. Training progress and reports are available to platform admins."
      />
      {employees.length === 0 ? (
        <p className="text-sm text-muted-foreground">No employees on your team yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {employees.map((emp) => (
            <Link key={emp.id} to={`/manager/team/${emp.id}`} className="block">
              <Card className="hover:bg-accent/30 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{emp.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{emp.email ?? 'No email'}</p>
                </div>
                {(() => {
                  const status = getProfileStatusBadge(emp)
                  return (
                    <Badge variant={status.variant} className="shrink-0 ml-2">
                      {status.label}
                    </Badge>
                  )
                })()}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
