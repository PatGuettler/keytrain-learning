import { useQuery } from '@tanstack/react-query'
import { fetchProfiles } from '@/services/users.service'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function UserManagementPage() {
  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => fetchProfiles(),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">User Management</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Role</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-3 pr-4 font-medium">{u.full_name}</td>
                <td className="py-3 pr-4 capitalize">{u.role}</td>
                <td className="py-3">
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
