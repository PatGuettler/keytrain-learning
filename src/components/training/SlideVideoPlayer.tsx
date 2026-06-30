import type { LessonSlideVideo } from '@/types/course.types'
import { DirectVideoPlayer } from './DirectVideoPlayer'
import { LoomPlayer } from './LoomPlayer'
import { VimeoPlayer } from './VimeoPlayer'
import { YouTubePlayer } from './YouTubePlayer'

export function SlideVideoPlayer({
  video,
  onWatched,
}: {
  video: LessonSlideVideo
  onWatched: () => void
}) {
  switch (video.provider) {
    case 'youtube':
      return <YouTubePlayer videoId={video.youtubeId} onWatched={onWatched} />
    case 'vimeo':
      return <VimeoPlayer vimeoId={video.vimeoId} onWatched={onWatched} />
    case 'loom':
      return <LoomPlayer loomId={video.loomId} onWatched={onWatched} />
    case 'direct':
      return <DirectVideoPlayer url={video.url} onWatched={onWatched} />
  }
}
