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
    <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
      {modules.map((m, i) => {
        const done = completedIndices.has(i)
        const current = i === currentIndex
        const locked = sequential && i > currentIndex && !completedIndices.has(i - 1) && i !== 0 && !done

        return (
          <div
            key={m.id}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm min-w-[140px] lg:min-w-0',
              current && 'bg-primary/10 border border-primary',
              done && 'text-emerald-700',
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
            <span className="truncate">{m.title}</span>
          </div>
        )
      })}
    </div>
  )
}
