import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Upload, FileSpreadsheet } from 'lucide-react'
import { CsvImportPreviewDialog } from '@/components/admin/CsvImportPreviewDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { APP_SLUG } from '@/lib/constants'
import { parseUserImportCsv } from '@/lib/csv-user-import'
import type { CsvUserImportRow } from '@/lib/csv-user-import'
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
  a.download = `${APP_SLUG}-users-sample.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function OrgUserImportPanel({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [sendInvites, setSendInvites] = useState(true)
  const [fileName, setFileName] = useState<string | null>(null)
  const [csvText, setCsvText] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<CsvUserImportRow[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [parseError, setParseError] = useState('')
  const [loading, setLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [results, setResults] = useState<ImportUserRowResult[] | null>(null)
  const [summary, setSummary] = useState<{
    total: number
    invited: number
    created: number
    skipped: number
    failed: number
  } | null>(null)

  const resetImportState = () => {
    setResults(null)
    setSummary(null)
    setImportError('')
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setParseError('')
    resetImportState()
    setPreviewOpen(false)
    if (!file) {
      setFileName(null)
      setCsvText(null)
      setPreviewRows([])
      return
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a .csv file.')
      setFileName(null)
      setCsvText(null)
      setPreviewRows([])
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const parsed = parseUserImportCsv(text)
      if (parsed.error) {
        setParseError(parsed.error)
        setFileName(null)
        setCsvText(null)
        setPreviewRows([])
        return
      }
      setCsvText(text)
      setFileName(file.name)
      setPreviewRows(parsed.rows)
    }
    reader.onerror = () => setParseError('Could not read file.')
    reader.readAsText(file)
  }

  const openPreview = () => {
    if (!csvText || previewRows.length === 0) {
      setParseError('Choose a valid CSV file first.')
      return
    }
    resetImportState()
    setPreviewOpen(true)
  }

  const runImport = async () => {
    if (!csvText) return
    setLoading(true)
    setImportError('')
    try {
      const data = await importUsersFromCsv(orgId, csvText, sendInvites)
      setResults(data.rows)
      setSummary(data.summary)
      await queryClient.invalidateQueries({ queryKey: ['org-users', orgId] })
      await queryClient.invalidateQueries({ queryKey: ['organizations'] })
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDialogClose = (open: boolean) => {
    setPreviewOpen(open)
    if (!open && summary) {
      setResults(null)
      setSummary(null)
    }
  }

  return (
    <>
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
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-sm file:text-foreground"
              onChange={onFileChange}
            />
            {fileName && (
              <p className="text-xs text-muted-foreground">
                Selected: {fileName} · {previewRows.length} user{previewRows.length === 1 ? '' : 's'} detected
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer text-foreground">
            <input
              type="checkbox"
              checked={sendInvites}
              onChange={(e) => setSendInvites(e.target.checked)}
              className="rounded border-input"
            />
            Send invite emails
          </label>

          {parseError && <p className="text-sm text-destructive">{parseError}</p>}

          <Button
            type="button"
            onClick={openPreview}
            disabled={!csvText || previewRows.length === 0}
            className="min-h-11"
          >
            <Upload className="h-4 w-4 mr-2" />
            Review import
          </Button>
        </CardContent>
      </Card>

      <CsvImportPreviewDialog
        open={previewOpen}
        onOpenChange={handleDialogClose}
        fileName={fileName}
        rows={previewRows}
        sendInvites={sendInvites}
        importing={loading}
        importError={importError}
        results={results}
        summary={summary}
        onConfirmImport={runImport}
      />
    </>
  )
}
