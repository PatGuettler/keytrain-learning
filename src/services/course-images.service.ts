import { getSupabase } from '@/services/supabase'

const BUCKET = 'course-images'
const MAX_BYTES = 5 * 1024 * 1024

function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    default:
      return 'bin'
  }
}

function normalizeImageFile(file: File): File {
  if (file.type.startsWith('image/')) return file
  const name = file.name?.trim() || 'pasted-image.png'
  return new File([file], name, { type: 'image/png' })
}

export async function uploadCourseImage(file: File): Promise<string> {
  const normalized = normalizeImageFile(file)
  if (!normalized.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (normalized.size > MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller.')
  }

  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Storage is not configured.')
  }

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    throw new Error('You must be signed in to upload images.')
  }

  const ext = extensionForMime(normalized.type)
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, normalized, {
    cacheControl: '3600',
    upsert: false,
    contentType: normalized.type,
  })
  if (error) {
    if (error.message.includes('row-level security')) {
      throw new Error(
        'Image upload blocked by storage permissions. Confirm migration 032_fix_course_images_storage_rls.sql is applied and you are signed in as an admin.'
      )
    }
    throw error
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
