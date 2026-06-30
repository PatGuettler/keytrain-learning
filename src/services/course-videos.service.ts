import { getSupabase } from '@/services/supabase'

const BUCKET = 'course-videos'
const MAX_BYTES = 100 * 1024 * 1024

const ALLOWED_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
])

function extensionForMime(mime: string): string {
  switch (mime) {
    case 'video/mp4':
      return 'mp4'
    case 'video/webm':
      return 'webm'
    case 'video/quicktime':
      return 'mov'
    case 'video/x-msvideo':
      return 'avi'
    default:
      return 'mp4'
  }
}

function normalizeVideoFile(file: File): File {
  if (ALLOWED_TYPES.has(file.type)) return file
  const name = file.name?.trim() || 'upload.mp4'
  return new File([file], name, { type: 'video/mp4' })
}

export async function uploadCourseVideo(file: File): Promise<string> {
  const normalized = normalizeVideoFile(file)
  if (
    !ALLOWED_TYPES.has(normalized.type) &&
    !normalized.name.match(/\.(mp4|webm|mov|m4v|avi)$/i)
  ) {
    throw new Error('Please choose an MP4, WebM, or MOV video file.')
  }
  if (normalized.size > MAX_BYTES) {
    throw new Error('Video must be 100 MB or smaller.')
  }

  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Storage is not configured.')
  }

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    throw new Error('You must be signed in to upload videos.')
  }

  const ext = extensionForMime(normalized.type)
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, normalized, {
    cacheControl: '3600',
    upsert: false,
    contentType: normalized.type.startsWith('video/') ? normalized.type : 'video/mp4',
  })
  if (error) {
    if (error.message.includes('row-level security')) {
      throw new Error(
        'Video upload blocked by storage permissions. Confirm migration 033_course_videos_storage.sql is applied and you are signed in as an admin.'
      )
    }
    throw error
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
