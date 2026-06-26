import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings2, X } from 'lucide-react'
import { createTrainingTag, fetchTrainingTags } from '@/services/training-tags.service'
import { ManageTagsDialog } from '@/components/admin/ManageTagsDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type TagMultiSelectProps = {
  id?: string
  label: string
  description?: string
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  /** Show manage-tags dialog button (default true). */
  allowManage?: boolean
}

export function TagMultiSelect({
  id = 'tag-multi-select',
  label,
  description,
  selectedTagIds,
  onChange,
  allowManage = true,
}: TagMultiSelectProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [createError, setCreateError] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['training-tags'],
    queryFn: fetchTrainingTags,
  })

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [tags, selectedTagIds]
  )

  const filteredTags = useMemo(() => {
    const q = inputValue.trim().toLowerCase()
    if (!q) return tags
    return tags.filter((tag) => tag.name.toLowerCase().includes(q))
  }, [tags, inputValue])

  const exactMatch = useMemo(() => {
    const q = inputValue.trim().toLowerCase()
    if (!q) return null
    return tags.find((tag) => tag.name.toLowerCase() === q) ?? null
  }, [tags, inputValue])

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  const invalidateTags = () => {
    void queryClient.invalidateQueries({ queryKey: ['training-tags'] })
    void queryClient.invalidateQueries({ queryKey: ['hospital-courses'] })
    void queryClient.invalidateQueries({ queryKey: ['course'] })
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => createTrainingTag(name),
    onSuccess: (tag) => {
      setInputValue('')
      setCreateError('')
      setDropdownOpen(false)
      if (!selectedTagIds.includes(tag.id)) {
        onChange([...selectedTagIds, tag.id])
      }
      invalidateTags()
    },
    onError: (e: Error) => setCreateError(e.message),
  })

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (!trimmed) return

      if (exactMatch) {
        if (!selectedTagIds.includes(exactMatch.id)) {
          onChange([...selectedTagIds, exactMatch.id])
        }
        setInputValue('')
        setDropdownOpen(false)
        return
      }

      createMutation.mutate(trimmed)
    }

    if (e.key === 'Escape') {
      setDropdownOpen(false)
      setInputValue('')
    }
  }

  const handleTagDeleted = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    }
  }

  const showCreateOption =
    inputValue.trim().length > 0 && !exactMatch && !createMutation.isPending

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {allowManage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={() => setManageOpen(true)}
          >
            <Settings2 className="h-4 w-4 mr-1" />
            Manage tags
          </Button>
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
              {tag.name}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                aria-label={`Remove ${tag.name}`}
                onClick={() => toggleTag(tag.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setCreateError('')
            setDropdownOpen(true)
          }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setDropdownOpen(false), 150)
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={
            isLoading
              ? 'Loading tags…'
              : tags.length === 0
                ? 'Type a tag name and press Enter'
                : 'Search tags or type a new name and press Enter'
          }
          disabled={isLoading || createMutation.isPending}
          autoComplete="off"
        />

        {dropdownOpen && (filteredTags.length > 0 || showCreateOption) && (
          <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover py-1 shadow-md">
            {filteredTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id)
              return (
                <li key={tag.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center px-3 py-2 text-sm text-left hover:bg-muted/80 ${
                      selected ? 'bg-primary/10 text-primary' : ''
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      toggleTag(tag.id)
                      setInputValue('')
                      setDropdownOpen(false)
                    }}
                  >
                    {tag.name}
                    {selected && <span className="ml-auto text-xs opacity-70">Selected</span>}
                  </button>
                </li>
              )
            })}
            {showCreateOption && (
              <li>
                <button
                  type="button"
                  className="flex w-full items-center px-3 py-2 text-sm text-left hover:bg-muted/80 text-primary"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => createMutation.mutate(inputValue.trim())}
                >
                  Create &ldquo;{inputValue.trim()}&rdquo;
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {createError && <p className="text-sm text-destructive">{createError}</p>}

      {allowManage && (
        <ManageTagsDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          onTagDeleted={handleTagDeleted}
        />
      )}
    </div>
  )
}
