import { parseYouTubeVideoId, youTubeWatchUrl } from '@/lib/youtube'
import type { LessonSlideVideo } from '@/types/course.types'

const VIMEO_ID_PATTERN = /^\d+$/
const LOOM_ID_PATTERN = /^[a-f0-9]{32}$/i

const DIRECT_VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogg|ogv)(\?.*)?$/i

export function parseVimeoVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (VIMEO_ID_PATTERN.test(trimmed)) return trimmed

  try {
    const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(`https://${trimmed}`)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const pathMatch = url.pathname.match(/\/(?:video\/)?(\d+)/)
      if (pathMatch?.[1] && VIMEO_ID_PATTERN.test(pathMatch[1])) return pathMatch[1]
    }
  } catch {
    return null
  }

  return null
}

export function parseLoomVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (LOOM_ID_PATTERN.test(trimmed)) return trimmed

  try {
    const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(`https://${trimmed}`)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'loom.com') {
      const shareMatch = url.pathname.match(/\/(?:share|embed)\/([a-f0-9]{32})/i)
      if (shareMatch?.[1]) return shareMatch[1]
    }
  } catch {
    return null
  }

  return null
}

function parseDirectVideoUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

    const path = url.pathname
    if (DIRECT_VIDEO_EXT.test(path)) return url.href
    if (path.includes('/course-videos/')) return url.href

    const host = url.hostname.replace(/^www\./, '')
    const embedHosts = new Set([
      'youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'youtu.be',
      'vimeo.com',
      'player.vimeo.com',
      'loom.com',
    ])
    if (!embedHosts.has(host)) return url.href
  } catch {
    return null
  }

  return null
}

/** Parse a pasted URL or ID into a slide video reference. */
export function parseVideoInput(input: string): LessonSlideVideo | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const youtubeId = parseYouTubeVideoId(trimmed)
  if (youtubeId) return { provider: 'youtube', youtubeId }

  const vimeoId = parseVimeoVideoId(trimmed)
  if (vimeoId) return { provider: 'vimeo', vimeoId }

  const loomId = parseLoomVideoId(trimmed)
  if (loomId) return { provider: 'loom', loomId }

  const directUrl = parseDirectVideoUrl(trimmed)
  if (directUrl) return { provider: 'direct', url: directUrl }

  return null
}

export function videoToInputValue(video: LessonSlideVideo | undefined): string {
  if (!video) return ''
  switch (video.provider) {
    case 'youtube':
      return youTubeWatchUrl(video.youtubeId)
    case 'vimeo':
      return `https://vimeo.com/${video.vimeoId}`
    case 'loom':
      return `https://www.loom.com/share/${video.loomId}`
    case 'direct':
      return video.url
  }
}

export function resolveSlideVideo(slide: {
  video?: LessonSlideVideo
  youtube?: { videoId: string }
}): LessonSlideVideo | undefined {
  if (slide.video) return slide.video
  const legacyId = slide.youtube?.videoId?.trim()
  if (legacyId) return { provider: 'youtube', youtubeId: legacyId }
  return undefined
}

export function slideRequiresVideo(slide: {
  video?: LessonSlideVideo
  youtube?: { videoId: string }
}): boolean {
  return Boolean(resolveSlideVideo(slide))
}
