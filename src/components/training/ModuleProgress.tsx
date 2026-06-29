import { Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Module } from '@/types/course.types'

interface ModuleProgressProps {
  modules: Module[]
  currentIndex: number
  completedIndices: Set<number>
  sequential?: boolean
  hideProgressBar?: boolean
}

export function ModuleProgress({
  modules,
  currentIndex,
  completedIndices,
  sequential = true,
  hideProgressBar = false,
}: ModuleProgressProps) {
  const current = modules[currentIndex]
  const progressPct =
    modules.length > 0 ? Math.round(((currentIndex + 1) / modules.length) * 100) : 0

  return (
    <div className="w-full min-w-0 max-w-full">
      {/* Mobile: compact step indicator */}
      <div className="lg:hidden space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Step {currentIndex + 1} of {modules.length}
          </span>
          <span className="capitalize">{current?.type ?? 'module'}</span>
        </div>
        {!hideProgressBar && (
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
        <p className="text-sm font-medium leading-snug line-clamp-2">{current?.title}</p>
      </div>

      {/* Desktop: full module list */}
      <div className="hidden lg:block">
        <p className="text-xs text-muted-foreground mb-2">Course modules</p>
        <div className="flex flex-col gap-2">
          {modules.map((m, i) => {
            const done = completedIndices.has(i)
            const isCurrent = i === currentIndex
            const locked =
              sequential && i > currentIndex && !completedIndices.has(i - 1) && i !== 0 && !done

            return (
              <div
                key={m.id}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm w-full',
                  isCurrent && 'bg-primary/10 border border-primary',
                  done && 'text-emerald-700 dark:text-emerald-400',
                  locked && 'opacity-50'
                )}
              >
                {done ? (
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : locked ? (
                  <Lock className="h-4 w-4 shrink-0" />
                ) : (
                  <span className="h-4 w-4 rounded-full border flex items-center justify-center text-xs shrink-0">
                    {i + 1}
                  </span>
                )}
                <span className="line-clamp-2 leading-snug min-w-0">{m.title}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
