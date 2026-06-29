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

export async function uploadCourseImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller.')
  }

  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Storage is not configured.')
  }

  const ext = extensionForMime(file.type)
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
