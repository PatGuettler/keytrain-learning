import { Bold, Heading2, Italic, Link2, List } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'

const textareaClass =
  'flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string
): string {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selected = value.slice(start, end) || placeholder
  const next = value.slice(0, start) + before + selected + after + value.slice(end)
  requestAnimationFrame(() => {
    textarea.focus()
    const cursor = start + before.length + selected.length
    textarea.setSelectionRange(cursor, cursor)
  })
  return next
}

export function MarkdownBodyField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const apply = (before: string, after: string, placeholderText: string) => {
    const el = ref.current
    if (!el) {
      onChange(value + before + placeholderText + after)
      return
    }
    onChange(wrapSelection(el, before, after, placeholderText))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => apply('**', '**', 'bold')}
          aria-label="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => apply('*', '*', 'italic')}
          aria-label="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => apply('## ', '', 'Heading')}
          aria-label="Heading"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => apply('- ', '', 'List item')}
          aria-label="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => apply('[', '](https://)', 'link text')}
          aria-label="Link"
        >
          <Link2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <textarea
        ref={ref}
        className={textareaClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Supports Markdown and HTML: **bold**, lists, links, etc.'}
      />
    </div>
  )
}
