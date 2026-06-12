import { useMemo, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { CsvUserImportRow } from '@/lib/csv-user-import'
import type { ImportUserRowResult } from '@/services/user-management.service'

function statusVariant(status: ImportUserRowResult['status']) {
  switch (status) {
    case 'invited':
    case 'created':
      return 'success' as const
    case 'skipped':
      return 'secondary' as const
    case 'error':
      return 'destructive' as const
  }
}

export function CsvImportPreviewDialog({
  open,
  onOpenChange,
  fileName,
  rows,
  sendInvites,
  importing,
  importError,
  results,
  summary,
  onConfirmImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName: string | null
  rows: CsvUserImportRow[]
  sendInvites: boolean
  importing: boolean
  importError: string
  results: ImportUserRowResult[] | null
  summary: {
    total: number
    invited: number
    created: number
    skipped: number
    failed: number
  } | null
  onConfirmImport: () => void
}) {
  const [query, setQuery] = useState('')
  const showResults = Boolean(summary && results)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (row) =>
        row.email.includes(q) ||
        row.full_name.toLowerCase().includes(q) ||
        row.role.includes(q) ||
        row.manager_email.includes(q)
    )
  }, [rows, query])

  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery('')
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {showResults ? 'Import complete' : 'Review import'}
          </DialogTitle>
          <DialogDescription>
            {showResults
              ? `Finished processing ${summary!.total} user${summary!.total === 1 ? '' : 's'} from ${fileName ?? 'CSV'}.`
              : `Confirm ${rows.length} user${rows.length === 1 ? '' : 's'} from ${fileName ?? 'CSV'} before sending invites.`}
          </DialogDescription>
        </DialogHeader>

        {showResults ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {summary!.invited} invited · {summary!.created} created · {summary!.skipped} skipped ·{' '}
              {summary!.failed} failed
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2 font-medium">Email</th>
                    <th className="p-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results!.map((row) => (
                    <tr key={row.email} className="border-b last:border-0">
                      <td className="p-2 font-mono text-xs text-foreground">{row.email}</td>
                      <td className="p-2">
                        <Badge variant={statusVariant(row.status)} className="capitalize">
                          {row.status}
                        </Badge>
                        {row.message && (
                          <span className="ml-2 text-xs text-muted-foreground">{row.message}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-foreground">
                {rows.length} user{rows.length === 1 ? '' : 's'} ready to import
                {query && filtered.length !== rows.length && (
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    · showing {filtered.length}
                  </span>
                )}
              </p>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email…"
                  className="pl-9"
                  aria-label="Search users in import preview"
                />
              </div>
            </div>

            <div className="max-h-[50dvh] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2 font-medium">Name</th>
                    <th className="p-2 font-medium">Email</th>
                    <th className="p-2 font-medium">Role</th>
                    <th className="p-2 font-medium hidden sm:table-cell">Manager</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No users match &ldquo;{query}&rdquo;
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={`${row.line}-${row.email}`} className="border-b last:border-0">
                        <td className="p-2 text-foreground">{row.full_name}</td>
                        <td className="p-2 font-mono text-xs text-foreground">{row.email}</td>
                        <td className="p-2 capitalize text-foreground">{row.role}</td>
                        <td className="p-2 hidden sm:table-cell text-muted-foreground">
                          {row.manager_email || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              {sendInvites
                ? 'Invite emails will be sent after you confirm.'
                : 'Accounts will be created without sending invite emails.'}
            </p>

            {importError && <p className="text-sm text-destructive">{importError}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button type="button" onClick={onConfirmImport} disabled={importing || rows.length === 0}>
                <UserPlus className="h-4 w-4" />
                {importing
                  ? 'Inviting…'
                  : sendInvites
                    ? `Invite ${rows.length} user${rows.length === 1 ? '' : 's'}`
                    : `Import ${rows.length} user${rows.length === 1 ? '' : 's'}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
