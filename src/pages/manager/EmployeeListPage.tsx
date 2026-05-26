import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchProfiles } from '@/services/users.service'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function EmployeeListPage() {
  const userId = useAuthStore((s) => s.userId)
  const { data: team = [] } = useQuery({
    queryKey: ['team', userId],
    queryFn: () => fetchProfiles({ managerId: userId! }),
    enabled: Boolean(userId),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Team</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {team
          .filter((p) => p.role === 'employee')
          .map((emp) => (
            <Link key={emp.id} to={`/manager/team/${emp.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold">{emp.full_name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{emp.role}</p>
                  </div>
                  <Badge variant={emp.is_active ? 'success' : 'secondary'}>
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>
    </div>
  )
}
