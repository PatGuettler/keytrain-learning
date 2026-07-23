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
type ResponseFilter = 'all' | 'needs_response' | 'responded' | 'overdue'

export function OrgStaffDirectory({
  rows,
  getStaffDetailPath,
  title = 'Staff training',
  showOrgColumn = false,
  showMonthColumn = true,
}: {
  rows: StaffSummaryRow[]
  getStaffDetailPath: (userId: string) => string
  title?: string
  showOrgColumn?: boolean
  showMonthColumn?: boolean
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (roleFilter !== 'all' && row.role !== roleFilter) return false
      if (responseFilter === 'needs_response' && row.currentMonthOpen <= 0) return false
      if (responseFilter === 'responded' && (row.currentMonthOpen > 0 || row.totalCourses === 0)) {
        return false
      }
      if (responseFilter === 'overdue' && row.overdueCourses <= 0) return false
      if (!q) return true
      return (
        row.userName.toLowerCase().includes(q) ||
        (row.userEmail?.toLowerCase().includes(q) ?? false) ||
        (row.orgName?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [rows, query, roleFilter, responseFilter])

  const openStaff = (userId: string) => {
    const path = getStaffDetailPath(userId)
    if (path) navigate(path)
  }

  const showOrg = showOrgColumn || rows.some((r) => Boolean(r.orgName))

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {showMonthColumn
              ? 'Filter by organization response status, then open a staff member for course detail. Scores show average completed training.'
              : 'Open a staff member for course detail. Scores show average completed training.'}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search staff by name, email, or org…"
              className="pl-9"
              aria-label="Search staff"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['all', 'All'],
                ...(showMonthColumn
                  ? ([
                      ['needs_response', 'Not responded'],
                      ['responded', 'Responded'],
                    ] as const)
                  : []),
                ['overdue', 'Overdue'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setResponseFilter(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  responseFilter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {label}
              </button>
            ))}
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
                {role === 'all' ? 'All roles' : `${role}s`}
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
            No staff match your filters.
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
                          {showOrg && row.orgName ? (
                            <p className="text-xs text-muted-foreground mt-0.5">{row.orgName}</p>
                          ) : null}
                          <p className="text-xs text-muted-foreground capitalize mt-1">{row.role}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
                        {showMonthColumn && row.currentMonthOpen > 0 ? (
                          <Badge variant="destructive">
                            {row.currentMonthOpen} need response
                          </Badge>
                        ) : null}
                        <span className="text-muted-foreground">
                          {row.completedCourses}/{row.totalCourses} courses
                        </span>
                        <span className="font-medium tabular-nums">
                          Score {row.avgScore != null ? `${row.avgScore}%` : '—'}
                        </span>
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
                    {showOrg ? <th className="pb-2 pr-4">Organization</th> : null}
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2 pr-4">Progress</th>
                    <th className="pb-2 pr-4">Avg score</th>
                    {showMonthColumn ? <th className="pb-2 pr-4">This month</th> : null}
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
                        {showOrg ? (
                          <td className="py-3 pr-4 text-muted-foreground">{row.orgName ?? '—'}</td>
                        ) : null}
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
                        <td className="py-3 pr-4 tabular-nums font-medium">
                          {row.avgScore != null ? `${row.avgScore}%` : '—'}
                        </td>
                        {showMonthColumn ? (
                          <td className="py-3 pr-4">
                            {row.currentMonthOpen > 0 ? (
                              <Badge variant="destructive">
                                {row.currentMonthOpen} open
                              </Badge>
                            ) : (
                              <Badge variant="success">Caught up</Badge>
                            )}
                          </td>
                        ) : null}
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
