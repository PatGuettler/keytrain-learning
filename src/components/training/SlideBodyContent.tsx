import { renderSlideBody } from '@/lib/rich-text'
import { cn } from '@/lib/utils'

export function SlideBodyContent({
  body,
  className,
}: {
  body: string
  className?: string
}) {
  const html = renderSlideBody(body)
  if (!html) return null

  return (
    <div
      className={cn(
        'prose prose-sm sm:prose-base dark:prose-invert max-w-none break-anywhere min-w-0',
        'text-muted-foreground leading-relaxed',
        '[&_a]:text-primary [&_a]:underline',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
