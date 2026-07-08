import { getSupabase } from '@/services/supabase'

const BUCKET = 'course-pdfs'
const MAX_BYTES = 25 * 1024 * 1024

export async function uploadCoursePdf(file: File): Promise<{ url: string; fileName: string }> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Please choose a PDF file.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('PDF must be 25 MB or smaller.')
  }

  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Storage is not configured.')
  }

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    throw new Error('You must be signed in to upload PDFs.')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'document.pdf'
  const path = `${crypto.randomUUID()}-${safeName}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'application/pdf',
  })
  if (error) {
    if (error.message.includes('row-level security')) {
      throw new Error(
        'PDF upload blocked by storage permissions. Confirm migration 042_course_certificates.sql is applied and you are signed in as an admin.'
      )
    }
    throw error
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, fileName: file.name }
}
