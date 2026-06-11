import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { fetchAssignments } from '@/services/assignments.service'
import { fetchUserModuleAttempts, fetchSessions } from '@/services/sessions.service'
import { fetchOrgMembers } from '@/services/users.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { StaffTrainingDetailSections } from '@/components/dashboard/StaffTrainingDetailSections'
import { buildStaffTrainingRows } from '@/lib/dashboard-stats'

export function AdminStaffTrainingPage() {
  const { orgId, userId } = useParams<{ orgId: string; userId: string }>()

  const { data: users = [] } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: () => fetchOrgMembers(orgId!, true),
    enabled: Boolean(orgId),
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', userId],
    queryFn: () => fetchAssignments(userId),
    enabled: Boolean(userId),
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['training-sessions', userId],
    queryFn: () => fetchSessions(userId),
    enabled: Boolean(userId),
  })

  const { data: moduleAttempts = [] } = useQuery({
    queryKey: ['user-module-attempts', userId],
    queryFn: () => fetchUserModuleAttempts(userId!),
    enabled: Boolean(userId),
  })

  const user = users.find((u) => u.id === userId)
  const trainingRows = useMemo(
    () => buildStaffTrainingRows(assignments, user ? [user] : []),
    [assignments, user]
  )

  if (!user) {
    return <p className="text-sm text-muted-foreground">Staff member not found.</p>
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/admin/dashboard/${orgId}`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to hospital dashboard
        </Link>
      </Button>

      <PageHeader title={user.full_name} description={user.email ?? 'Staff training record'} />

      <StaffTrainingDetailSections
        trainingRows={trainingRows}
        sessions={sessions}
        moduleAttempts={moduleAttempts}
      />
    </div>
  )
}
