import type { LessonContent, LessonSlide, LessonSlideVideo } from '@/types/course.types'

function normalizeVideo(raw: unknown, legacyYoutube?: unknown): LessonSlideVideo | undefined {
  if (raw && typeof raw === 'object') {
    const v = raw as Record<string, unknown>
    const provider = v.provider
    if (provider === 'youtube' && typeof v.youtubeId === 'string' && v.youtubeId.length > 0) {
      return { provider: 'youtube', youtubeId: v.youtubeId }
    }
    if (provider === 'vimeo' && typeof v.vimeoId === 'string' && v.vimeoId.length > 0) {
      return { provider: 'vimeo', vimeoId: v.vimeoId }
    }
    if (provider === 'loom' && typeof v.loomId === 'string' && v.loomId.length > 0) {
      return { provider: 'loom', loomId: v.loomId }
    }
    if (provider === 'direct' && typeof v.url === 'string' && v.url.length > 0) {
      return { provider: 'direct', url: v.url }
    }
  }

  if (legacyYoutube && typeof legacyYoutube === 'object') {
    const videoId = (legacyYoutube as { videoId?: string }).videoId
    if (typeof videoId === 'string' && videoId.length > 0) {
      return { provider: 'youtube', youtubeId: videoId }
    }
  }

  return undefined
}

export function coerceRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      /* ignore */
    }
    return {}
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function normalizeSlide(raw: unknown, index: number): LessonSlide | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const heading = typeof s.heading === 'string' ? s.heading : `Slide ${index + 1}`
  const body = typeof s.body === 'string' ? s.body : ''
  const layout = s.layout as LessonSlide['layout'] | undefined
  const validLayouts = new Set(['image-right', 'image-left', 'image-top', 'full-bleed', 'image-only'])
  const rawYoutube = s.youtube
  const video = normalizeVideo(s.video, rawYoutube)
  let youtube: LessonSlide['youtube'] | undefined
  if (rawYoutube && typeof rawYoutube === 'object') {
    const videoId = (rawYoutube as { videoId?: string }).videoId
    if (typeof videoId === 'string' && videoId.length > 0) {
      youtube = { videoId }
    }
  }
  return {
    id: typeof s.id === 'string' ? s.id : `slide_${index}`,
    heading,
    body,
    layout: layout && validLayouts.has(layout) ? layout : 'image-right',
    illustration:
      s.illustration && typeof s.illustration === 'object'
        ? (s.illustration as LessonSlide['illustration'])
        : undefined,
    video,
    youtube,
  }
}

/** Normalize lesson module JSON from Supabase or legacy shapes. */
export function parseLessonContent(content: unknown): LessonContent {
  if (Array.isArray(content)) {
    const slides = content
      .map((item, i) => normalizeSlide(item, i))
      .filter((s): s is LessonSlide => s !== null)
    return { slides }
  }

  const raw = coerceRecord(content)

  if (typeof raw.heading === 'string' && typeof raw.body === 'string' && !raw.slides) {
    const single = normalizeSlide(raw, 0)
    return { slides: single ? [single] : [] }
  }

  const rawSlides = Array.isArray(raw.slides) ? raw.slides : []
  const slides = rawSlides
    .map((item, i) => normalizeSlide(item, i))
    .filter((s): s is LessonSlide => s !== null)

  return { slides }
}
