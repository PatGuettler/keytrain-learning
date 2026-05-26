import { Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Module } from '@/types/course.types'

interface ModuleProgressProps {
  modules: Module[]
  currentIndex: number
  completedIndices: Set<number>
  sequential?: boolean
}

export function ModuleProgress({
  modules,
  currentIndex,
  completedIndices,
  sequential = true,
}: ModuleProgressProps) {
  return (
    <div className="w-full min-w-0 max-w-full">
      <p className="text-xs text-muted-foreground mb-2 lg:sr-only">Swipe to see all modules</p>
      <div
        className={cn(
          'flex gap-2 overflow-x-auto overscroll-x-contain pb-1',
          'snap-x snap-mandatory scrollbar-thin',
          'lg:flex-col lg:overflow-visible lg:snap-none lg:pb-0'
        )}
      >
        {modules.map((m, i) => {
          const done = completedIndices.has(i)
          const current = i === currentIndex
          const locked =
            sequential && i > currentIndex && !completedIndices.has(i - 1) && i !== 0 && !done

          return (
            <div
              key={m.id}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm shrink-0 snap-start',
                'w-[min(100%,17.5rem)] max-w-[85vw] lg:w-full lg:max-w-none',
                current && 'bg-primary/10 border border-primary',
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
  )
}
