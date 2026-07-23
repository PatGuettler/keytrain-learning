import { cn } from '@/lib/utils'
import type { AvailabilityFilter } from '@/lib/learner-course-availability'

const OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'closed', label: 'Closed' },
]

export function LearnerCourseAvailabilityFilter({
  value,
  onChange,
  counts,
}: {
  value: AvailabilityFilter
  onChange: (value: AvailabilityFilter) => void
  counts?: Partial<Record<AvailabilityFilter, number>>
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by availability">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            value === option.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {option.label}
          {counts?.[option.value] != null ? ` (${counts[option.value]})` : ''}
        </button>
      ))}
    </div>
  )
}
