import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { inviteOrgUser } from '@/services/user-management.service'
import type { Profile, UserRole } from '@/types/user.types'

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function AddOrgUserForm({
  orgId,
  managers,
}: {
  orgId: string
  managers: Profile[]
}) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('employee')
  const [managerId, setManagerId] = useState('')
  const [sendInvite, setSendInvite] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const managerEmail = managers.find((m) => m.id === managerId)?.email ?? undefined

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await inviteOrgUser(orgId, {
        email: email.trim(),
        full_name: fullName.trim() || undefined,
        role,
        manager_email: role === 'employee' && managerEmail ? managerEmail : undefined,
        send_invites: sendInvite,
      })
      setMessage(result.message ?? `User ${result.status}.`)
      setEmail('')
      setFullName('')
      setRole('employee')
      setManagerId('')
      await queryClient.invalidateQueries({ queryKey: ['org-users', orgId] })
      await queryClient.invalidateQueries({ queryKey: ['organizations'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add user
        </CardTitle>
        <CardDescription>
          New users default to employee. Change role below if needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="add-email">Email</Label>
            <Input
              id="add-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-name">Full name (optional)</Label>
            <Input
              id="add-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Derived from email if empty"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-role">Role</Label>
            <select
              id="add-role"
              className={selectClass}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          {role === 'employee' && managers.length > 0 && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="add-manager">Manager (optional)</Label>
              <select
                id="add-manager"
                className={selectClass}
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
              >
                <option value="">No manager assigned</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.email ?? m.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm sm:col-span-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="rounded border-input"
            />
            Send invite email
          </label>
          {error && (
            <p className="text-sm text-destructive sm:col-span-2 whitespace-pre-line">{error}</p>
          )}
          {message && <p className="text-sm text-emerald-600 dark:text-emerald-400 sm:col-span-2">{message}</p>}
          <Button type="submit" disabled={loading} className="sm:col-span-2 w-full sm:w-auto">
            {loading ? 'Adding…' : 'Add user'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
