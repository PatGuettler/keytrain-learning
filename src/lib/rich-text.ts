import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'a',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'code',
    'pre',
    'hr',
    'span',
    'div',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
} as const

function looksLikeHtml(source: string): boolean {
  return /^<[a-z][\s\S]*>/i.test(source.trim())
}

/** Render slide body as sanitized HTML from Markdown or raw HTML. */
export function renderSlideBody(source: string): string {
  const trimmed = source.trim()
  if (!trimmed) return ''

  const raw = looksLikeHtml(trimmed)
    ? trimmed
    : (marked.parse(trimmed, { async: false }) as string)

  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [...SANITIZE_OPTIONS.ALLOWED_TAGS],
    ALLOWED_ATTR: [...SANITIZE_OPTIONS.ALLOWED_ATTR],
  })
}
