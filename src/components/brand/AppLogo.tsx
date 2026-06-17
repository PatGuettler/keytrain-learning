import { cn } from '@/lib/utils'

type AppLogoProps = {
  className?: string
  alt?: string
}

function LogoMark({ color, className }: { color: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 88 104"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g fill={color}>
        <rect x="27" y="4" width="34" height="5" rx="0.5" />
        <rect x="36" y="9" width="16" height="11" />
        <circle cx="44" cy="46" r="26" />
        <path d="M14 72L22 72L30 98H22L14 72Z" />
        <path d="M26 72H32L36 98H30L26 72Z" />
        <path d="M56 72H62L58 98H52L56 72Z" />
        <path d="M66 72L74 72L66 98H58L66 72Z" />
      </g>
      <path
        fill="white"
        d="M52.2 36.8c0-5.8-4.4-9.2-10.6-9.2-6.8 0-11.2 4.4-11.2 11.2 0 7.2 4.8 11.6 12.4 11.6 3.8 0 7.2-1.2 9.4-3.4l-2.8-3.6c-1.8 1.6-4 2.4-6.4 2.4-4.2 0-6.8-2.4-7.2-6.4h15.8c.2-.8.6-1.6.6-2.6zm-15.4-2.2c.8-3.2 3.2-5 6.4-5 3 0 5 1.8 5.4 5h-11.8zM49.8 58.4h4.2V39.8h-4.2v18.6z"
      />
    </svg>
  )
}

export function AppLogo({ className, alt = 'KeyTrain Learning' }: AppLogoProps) {
  return (
    <span className={cn('inline-flex shrink-0', className)} role="img" aria-label={alt}>
      <LogoMark color="#5CB4A8" className="h-full w-full dark:hidden" />
      <LogoMark color="#7A90A8" className="hidden h-full w-full dark:block" />
    </span>
  )
}
