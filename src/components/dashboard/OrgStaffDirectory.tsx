import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { staffOverallStatus, type StaffSummaryRow } from '@/lib/dashboard-stats'
import type { UserRole } from '@/types/user.types'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  completed: 'success',
  in_progress: 'default',
  pending: 'secondary',
  overdue: 'destructive',
  none: 'secondary',
}

const statusLabel: Record<string, string> = {
  completed: 'All complete',
  in_progress: 'In progress',
  pending: 'Not started',
  overdue: 'Overdue',
  none: 'No courses',
}

type RoleFilter = 'all' | UserRole

export function OrgStaffDirectory({
  rows,
  getStaffDetailPath,
  title = 'Staff training',
}: {
  rows: StaffSummaryRow[]
  getStaffDetailPath: (userId: string) => string
  title?: string
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (roleFilter !== 'all' && row.role !== roleFilter) return false
      if (!q) return true
      return (
        row.userName.toLowerCase().includes(q) ||
        (row.userEmail?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [rows, query, roleFilter])

  const openStaff = (userId: string) => navigate(getStaffDetailPath(userId))

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Search by name or email, then open a staff member to view their courses.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search staff by name or email…"
              className="pl-9"
              aria-label="Search staff"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(['all', 'employee', 'manager'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  roleFilter === role
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {role === 'all' ? 'All' : `${role}s`}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No staff in this organization.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No staff match &quot;{query}&quot;.
          </p>
        ) : (
          <>
            <ul className="md:hidden space-y-2">
              {filtered.map((row) => {
                const status = staffOverallStatus(row)
                return (
                  <li key={row.userId}>
                    <button
                      type="button"
                      className="w-full rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => openStaff(row.userId)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-primary">{row.userName}</p>
                          <p className="text-xs text-muted-foreground truncate">{row.userEmail}</p>
                          <p className="text-xs text-muted-foreground capitalize mt-1">{row.role}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
                        <span className="text-muted-foreground">
                          {row.completedCourses}/{row.totalCourses} courses
                        </span>
                        {row.avgScore != null && (
                          <span className="text-muted-foreground">Avg {row.avgScore}%</span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Staff</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2 pr-4">Progress</th>
                    <th className="pb-2 pr-4">Avg score</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const status = staffOverallStatus(row)
                    return (
                      <tr
                        key={row.userId}
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => openStaff(row.userId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openStaff(row.userId)
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`View training for ${row.userName}`}
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium text-primary group-hover:underline underline-offset-2">
                            {row.userName}
                          </p>
                          {row.userEmail && (
                            <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                          )}
                          {!row.isActive && (
                            <Badge variant="secondary" className="mt-1 text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4 capitalize text-muted-foreground">{row.role}</td>
                        <td className="py-3 pr-4 tabular-nums">
                          <span className="font-medium">
                            {row.completedCourses}/{row.totalCourses}
                          </span>
                          <span className="text-muted-foreground"> complete</span>
                          {row.lockedCourses > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {row.lockedCourses} locked
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4 tabular-nums">
                          {row.avgScore != null ? `${row.avgScore}%` : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          <ChevronRight className="h-4 w-4" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Showing {filtered.length} of {rows.length} staff
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
