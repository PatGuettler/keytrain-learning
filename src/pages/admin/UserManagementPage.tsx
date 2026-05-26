import { useQuery } from '@tanstack/react-query'
import { fetchProfiles } from '@/services/users.service'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/PageHeader'

export function UserManagementPage() {
  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => fetchProfiles(),
  })

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="User Management" />

      <ul className="md:hidden space-y-3">
        {users.map((u) => (
          <li key={u.id} className="rounded-lg border bg-card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{u.full_name}</p>
              <p className="text-sm text-muted-foreground capitalize">{u.role}</p>
            </div>
            <Badge variant={u.is_active ? 'success' : 'secondary'} className="shrink-0">
              {u.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 pr-4">Name</th>
              <th className="p-3 pr-4">Role</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3 pr-4 font-medium">{u.full_name}</td>
                <td className="p-3 pr-4 capitalize">{u.role}</td>
                <td className="p-3">
                  <Badge variant={u.is_active ? 'success' : 'secondary'}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-4 text-sm text-muted-foreground">
          User creation via Supabase Edge Function (auth.admin.createUser) — configure in production.
        </CardContent>
      </Card>
    </div>
  )
}
