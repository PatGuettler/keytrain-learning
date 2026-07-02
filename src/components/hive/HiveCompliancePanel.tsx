import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, FileDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { buildComplianceDraftContent, COMPLIANCE_DISCLAIMER } from '@/lib/compliance-generator'
import { exportComplianceDocumentPdf } from '@/lib/pdf/compliance-reports'
import { sortTrendReports, trendReportKey, trendReportLabel } from '@/lib/hive-records'
import {
  createComplianceDocument,
  fetchComplianceDocumentVersion,
  fetchComplianceDocuments,
  fetchComplianceTemplates,
  saveComplianceDocumentVersion,
} from '@/services/compliance.service'
import { useAuthStore } from '@/store/authStore'
import {
  COMPLIANCE_DOC_TYPE_LABELS,
  COMPLIANCE_STATUS_LABELS,
  type ComplianceDocument,
  type ComplianceDocumentType,
} from '@/types/compliance.types'
import type { HiveRecord } from '@/types/hive.types'

const textareaClass =
  'flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type HiveCompliancePanelProps = {
  trendReports: HiveRecord[]
  signatures: HiveRecord[]
}

export function HiveCompliancePanel({ trendReports, signatures }: HiveCompliancePanelProps) {
  const userId = useAuthStore((s) => s.userId)!
  const queryClient = useQueryClient()

  const [docType, setDocType] = useState<ComplianceDocumentType>('security_awareness')
  const [hiveOrgId, setHiveOrgId] = useState('')
  const [selectedTrendKey, setSelectedTrendKey] = useState('')
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [formContent, setFormContent] = useState<Record<string, string>>({})
  const [formStatus, setFormStatus] = useState<ComplianceDocument['status']>('draft')
  const [actionError, setActionError] = useState('')

  const sortedTrends = useMemo(() => sortTrendReports(trendReports), [trendReports])
  const orgIds = useMemo(
    () => [...new Set(sortedTrends.map((r) => String(r.hive_org_id ?? '')).filter(Boolean))].sort(),
    [sortedTrends]
  )

  const { data: templates = [] } = useQuery({
    queryKey: ['compliance-templates'],
    queryFn: fetchComplianceTemplates,
  })

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['compliance-documents'],
    queryFn: fetchComplianceDocuments,
  })

  const activeTemplate = templates.find((t) => t.doc_type === docType) ?? null
  const selectedTrend =
    sortedTrends.find((r) => trendReportKey(r) === selectedTrendKey) ??
    sortedTrends.find((r) => String(r.hive_org_id) === hiveOrgId) ??
    null

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['compliance-documents'] })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeTemplate) throw new Error('Template not found. Apply migration 035.')
      const org = hiveOrgId || String(selectedTrend?.hive_org_id ?? '')
      const content = buildComplianceDraftContent(
        docType,
        org,
        selectedTrend,
        signatures.filter((s) => !org || String(s.hive_org_id) === org)
      )
      return createComplianceDocument({
        doc_type: docType,
        title: activeTemplate.title,
        hive_org_id: org || undefined,
        content,
        aws_data_snapshot: selectedTrend
          ? { trend_report_sk: selectedTrend.sk, raw_metrics: selectedTrend.raw_metrics }
          : undefined,
        created_by: userId,
      })
    },
    onSuccess: (doc) => {
      setActionError('')
      void invalidate()
      void loadDocumentForEdit(doc)
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingDocId) throw new Error('No document selected.')
      return saveComplianceDocumentVersion({
        documentId: editingDocId,
        content: formContent,
        created_by: userId,
        status: formStatus,
      })
    },
    onSuccess: () => {
      setActionError('')
      void invalidate()
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const loadDocumentForEdit = async (doc: ComplianceDocument) => {
    setEditingDocId(doc.id)
    setFormStatus(doc.status)
    setDocType(doc.doc_type)
    if (doc.hive_org_id) setHiveOrgId(doc.hive_org_id)
    if (!doc.current_version_id) {
      setFormContent({})
      return
    }
    const version = await fetchComplianceDocumentVersion(doc.current_version_id)
    setFormContent((version?.content as Record<string, string>) ?? {})
  }

  const sections = activeTemplate?.template_structure?.sections ?? []

  const exportPdf = async (doc: ComplianceDocument) => {
    if (!doc.current_version_id) return
    const version = await fetchComplianceDocumentVersion(doc.current_version_id)
    if (!version) return
    const template = templates.find((t) => t.doc_type === doc.doc_type) ?? null
    exportComplianceDocumentPdf(doc, template, version)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generate compliance document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Auto-fill sections from Hive trend reports and approved signatures. Review and edit
            before exporting PDF.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            {COMPLIANCE_DISCLAIMER}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Document type</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={docType}
                onChange={(e) => setDocType(e.target.value as ComplianceDocumentType)}
              >
                {(Object.keys(COMPLIANCE_DOC_TYPE_LABELS) as ComplianceDocumentType[]).map((type) => (
                  <option key={type} value={type}>
                    {COMPLIANCE_DOC_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Hive org</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={hiveOrgId}
                onChange={(e) => setHiveOrgId(e.target.value)}
              >
                <option value="">Select org…</option>
                {orgIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trend report (optional — improves auto-fill)</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedTrendKey}
              onChange={(e) => setSelectedTrendKey(e.target.value)}
            >
              <option value="">Auto-pick latest for org</option>
              {sortedTrends.map((record) => (
                <option key={trendReportKey(record)} value={trendReportKey(record)}>
                  {trendReportLabel(record)}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create from AWS data
          </Button>
        </CardContent>
      </Card>

      {editingDocId && sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Workflow status</Label>
              <select
                className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formStatus}
                onChange={(e) =>
                  setFormStatus(e.target.value as ComplianceDocument['status'])
                }
              >
                <option value="draft">{COMPLIANCE_STATUS_LABELS.draft}</option>
                <option value="in_review">{COMPLIANCE_STATUS_LABELS.in_review}</option>
                <option value="approved">{COMPLIANCE_STATUS_LABELS.approved}</option>
              </select>
            </div>
            {sections.map((section) => (
              <div key={section.id} className="space-y-2">
                <Label>{section.label}</Label>
                <textarea
                  className={textareaClass}
                  value={formContent[section.id] ?? ''}
                  onChange={(e) =>
                    setFormContent((prev) => ({ ...prev, [section.id]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                Save new version
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingDocId(null)}>
                Close editor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Org</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-t">
                      <td className="px-3 py-2">{doc.title}</td>
                      <td className="px-3 py-2">{COMPLIANCE_DOC_TYPE_LABELS[doc.doc_type]}</td>
                      <td className="px-3 py-2">
                        {doc.hive_org_id ? (
                          <Badge variant="outline">{doc.hive_org_id}</Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2">{COMPLIANCE_STATUS_LABELS[doc.status]}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void loadDocumentForEdit(doc)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void exportPdf(doc)}
                          >
                            <FileDown className="h-3.5 w-3.5 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}
    </div>
  )
}
