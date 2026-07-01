import { getSupabase } from '@/services/supabase'
import type {
  ComplianceDocument,
  ComplianceDocumentType,
  ComplianceDocumentVersion,
  ComplianceTemplate,
} from '@/types/compliance.types'

function requireSupabase() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend is not configured.')
  return supabase
}

export async function fetchComplianceTemplates(): Promise<ComplianceTemplate[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('compliance_document_templates' as 'courses')
    .select('*')
    .order('title')
  if (error) throw error
  return (data ?? []) as unknown as ComplianceTemplate[]
}

export async function fetchComplianceDocuments(): Promise<ComplianceDocument[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('compliance_documents' as 'courses')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as ComplianceDocument[]
}

export async function fetchComplianceDocumentVersion(
  versionId: string
): Promise<ComplianceDocumentVersion | null> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('compliance_document_versions' as 'courses')
    .select('*')
    .eq('id', versionId)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as ComplianceDocumentVersion) ?? null
}

export async function createComplianceDocument(input: {
  doc_type: ComplianceDocumentType
  title: string
  hive_org_id?: string
  content: Record<string, string>
  aws_data_snapshot?: Record<string, unknown>
  created_by: string
}): Promise<ComplianceDocument> {
  const supabase = requireSupabase()

  const { data: doc, error: docError } = await supabase
    .from('compliance_documents' as 'courses')
    .insert({
      doc_type: input.doc_type,
      title: input.title,
      hive_org_id: input.hive_org_id ?? null,
      status: 'draft',
      created_by: input.created_by,
    } as never)
    .select('*')
    .single()
  if (docError) throw docError

  const document = doc as unknown as ComplianceDocument

  const { data: version, error: versionError } = await supabase
    .from('compliance_document_versions' as 'courses')
    .insert({
      document_id: document.id,
      version_number: 1,
      content: input.content,
      aws_data_snapshot: input.aws_data_snapshot ?? null,
      created_by: input.created_by,
    } as never)
    .select('*')
    .single()
  if (versionError) throw versionError

  const { data: updated, error: linkError } = await supabase
    .from('compliance_documents' as 'courses')
    .update({
      current_version_id: (version as unknown as ComplianceDocumentVersion).id,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', document.id)
    .select('*')
    .single()
  if (linkError) throw linkError

  return updated as unknown as ComplianceDocument
}

export async function saveComplianceDocumentVersion(input: {
  documentId: string
  content: Record<string, string>
  aws_data_snapshot?: Record<string, unknown>
  created_by: string
  status?: ComplianceDocument['status']
}): Promise<ComplianceDocumentVersion> {
  const supabase = requireSupabase()

  const { data: existing, error: countError } = await supabase
    .from('compliance_document_versions' as 'courses')
    .select('version_number')
    .eq('document_id', input.documentId)
    .order('version_number', { ascending: false })
    .limit(1)
  if (countError) throw countError

  const nextVersion =
    existing && existing.length > 0
      ? Number((existing[0] as unknown as { version_number: number }).version_number) + 1
      : 1

  const { data: version, error: versionError } = await supabase
    .from('compliance_document_versions' as 'courses')
    .insert({
      document_id: input.documentId,
      version_number: nextVersion,
      content: input.content,
      aws_data_snapshot: input.aws_data_snapshot ?? null,
      created_by: input.created_by,
    } as never)
    .select('*')
    .single()
  if (versionError) throw versionError

  const updatePayload: Record<string, unknown> = {
    current_version_id: (version as unknown as ComplianceDocumentVersion).id,
    updated_at: new Date().toISOString(),
  }
  if (input.status) updatePayload.status = input.status

  const { error: docError } = await supabase
    .from('compliance_documents' as 'courses')
    .update(updatePayload as never)
    .eq('id', input.documentId)
  if (docError) throw docError

  return version as unknown as ComplianceDocumentVersion
}
