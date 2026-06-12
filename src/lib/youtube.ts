const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/

export function parseYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (YOUTUBE_ID_PATTERN.test(trimmed)) return trimmed

  try {
    const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(`https://${trimmed}`)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = url.searchParams.get('v')
      if (v && YOUTUBE_ID_PATTERN.test(v)) return v

      const embedMatch = url.pathname.match(/\/embed\/([\w-]{11})/)
      if (embedMatch?.[1]) return embedMatch[1]

      const shortsMatch = url.pathname.match(/\/shorts\/([\w-]{11})/)
      if (shortsMatch?.[1]) return shortsMatch[1]
    }
  } catch {
    return null
  }

  return null
}

export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}
