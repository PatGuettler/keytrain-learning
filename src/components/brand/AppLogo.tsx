import { cn } from '@/lib/utils'
import logoLight from '@/assets/logo-light.png'
import logoDark from '@/assets/logo-dark.png'

type AppLogoProps = {
  className?: string
  alt?: string
}

export function AppLogo({ className, alt = 'KeyTrain Learning' }: AppLogoProps) {
  return (
    <span className={cn('inline-flex shrink-0', className)} role="img" aria-label={alt}>
      <img
        src={logoLight}
        alt=""
        className="h-full w-auto object-contain dark:hidden"
        decoding="async"
      />
      <img
        src={logoDark}
        alt=""
        className="hidden h-full w-auto object-contain dark:block"
        decoding="async"
      />
    </span>
  )
}
