import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Upload, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { importUsersFromCsv, type ImportUserRowResult } from '@/services/user-management.service'

const SAMPLE_CSV = `email,full_name,role,manager_email
employee1@hospital.org,Sam Taylor,,manager@hospital.org
employee2@hospital.org,,employee,
manager@hospital.org,Jordan Chen,manager,`

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'guardianmd-users-sample.csv'
  a.click()
  URL.revokeObjectURL(url)
}

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

export function OrgUserImportPanel({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [sendInvites, setSendInvites] = useState(true)
  const [fileName, setFileName] = useState<string | null>(null)
  const [csvText, setCsvText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<ImportUserRowResult[] | null>(null)
  const [summary, setSummary] = useState<{
    total: number
    invited: number
    created: number
    skipped: number
    failed: number
  } | null>(null)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setError('')
    setResults(null)
    setSummary(null)
    if (!file) {
      setFileName(null)
      setCsvText(null)
      return
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCsvText(String(reader.result ?? ''))
      setFileName(file.name)
    }
    reader.onerror = () => setError('Could not read file.')
    reader.readAsText(file)
  }

  const runImport = async () => {
    if (!csvText) {
      setError('Choose a CSV file first.')
      return
    }
    setLoading(true)
    setError('')
    setResults(null)
    setSummary(null)
    try {
      const data = await importUsersFromCsv(orgId, csvText, sendInvites)
      setResults(data.rows)
      setSummary(data.summary)
      await queryClient.invalidateQueries({ queryKey: ['org-users', orgId] })
      await queryClient.invalidateQueries({ queryKey: ['organizations'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Bulk import (CSV)
        </CardTitle>
        <CardDescription>
          Only <strong>email</strong> is required. Role defaults to employee. List managers before employees.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button type="button" variant="outline" size="sm" onClick={downloadSampleCsv}>
          <Download className="h-4 w-4 mr-1" />
          Download sample CSV
        </Button>

        <div className="space-y-2">
          <Label htmlFor="user-csv">CSV file</Label>
          <input
            ref={fileRef}
            id="user-csv"
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-sm"
            onChange={onFileChange}
          />
          {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={sendInvites}
            onChange={(e) => setSendInvites(e.target.checked)}
            className="rounded border-input"
          />
          Send invite emails
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="button" onClick={runImport} disabled={loading || !csvText} className="min-h-11">
          <Upload className="h-4 w-4 mr-2" />
          {loading ? 'Importing…' : 'Import CSV'}
        </Button>

        {summary && (
          <p className="text-sm text-muted-foreground">
            {summary.invited} invited · {summary.created} created · {summary.skipped} skipped ·{' '}
            {summary.failed} failed
          </p>
        )}

        {results && results.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded-lg border text-sm">
            <table className="w-full">
              <tbody>
                {results.map((row) => (
                  <tr key={row.email} className="border-b last:border-0">
                    <td className="p-2 font-mono text-xs">{row.email}</td>
                    <td className="p-2">
                      <Badge variant={statusVariant(row.status)} className="capitalize">
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
