import { useQuery } from '@tanstack/react-query'
import { fetchProfiles } from '@/services/users.service'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
            <Card key={emp.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{emp.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{emp.email ?? 'No email'}</p>
                </div>
                <Badge variant={emp.is_active ? 'success' : 'secondary'} className="shrink-0 ml-2">
                  {emp.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
