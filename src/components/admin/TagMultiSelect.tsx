import { useQuery } from '@tanstack/react-query'
import { fetchTrainingTags } from '@/services/training-tags.service'
import { Label } from '@/components/ui/label'

type TagMultiSelectProps = {
  id?: string
  label: string
  description?: string
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

export function TagMultiSelect({
  id = 'tag-multi-select',
  label,
  description,
  selectedTagIds,
  onChange,
}: TagMultiSelectProps) {
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['training-tags'],
    queryFn: fetchTrainingTags,
  })

  const toggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tags…</p>
      ) : tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tags yet. Add tags on the Course Management page first.
        </p>
      ) : (
        <div id={id} className="flex flex-wrap gap-2 rounded-md border p-3">
          {tags.map((tag) => {
            const checked = selectedTagIds.includes(tag.id)
            return (
              <label
                key={tag.id}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
                  checked
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input hover:bg-muted/50'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggle(tag.id)}
                />
                {tag.name}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
