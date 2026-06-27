import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Settings2 } from 'lucide-react'
import { createTrainingTag, fetchTrainingTags } from '@/services/training-tags.service'
import { ManageTagsDialog } from '@/components/admin/ManageTagsDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type TagMultiSelectProps = {
  id?: string
  label: string
  description?: string
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
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
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [createError, setCreateError] = useState('')
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
    const q = search.trim().toLowerCase()
    if (!q) return tags
    return tags.filter((tag) => tag.name.toLowerCase().includes(q))
  }, [tags, search])

  const exactMatch = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    return tags.find((tag) => tag.name.toLowerCase() === q) ?? null
  }, [tags, search])

  const showCreateOption = search.trim().length > 0 && !exactMatch

  const invalidateTags = () => {
    void queryClient.invalidateQueries({ queryKey: ['training-tags'] })
    void queryClient.invalidateQueries({ queryKey: ['hospital-courses'] })
    void queryClient.invalidateQueries({ queryKey: ['course'] })
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => createTrainingTag(name),
    onSuccess: (tag) => {
      setSearch('')
      setCreateError('')
      if (!selectedTagIds.includes(tag.id)) {
        onChange([...selectedTagIds, tag.id])
      }
      invalidateTags()
    },
    onError: (e: Error) => setCreateError(e.message),
  })

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  const createFromSearch = () => {
    const trimmed = search.trim()
    if (!trimmed) return
    if (exactMatch) {
      if (!selectedTagIds.includes(exactMatch.id)) {
        onChange([...selectedTagIds, exactMatch.id])
      }
      setSearch('')
      return
    }
    createMutation.mutate(trimmed)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      createFromSearch()
    }
  }

  const handleTagDeleted = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    }
  }

  const triggerLabel =
    selectedTags.length === 0
      ? 'Select tags…'
      : selectedTags.length <= 2
        ? selectedTags.map((t) => t.name).join(', ')
        : `${selectedTags.length} tags selected`

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

      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <div className="max-w-md">
          <DropdownMenuTrigger asChild>
            <button
              id={id}
              type="button"
              disabled={isLoading}
              className={cn(
                'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
                'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                selectedTags.length === 0 && 'text-muted-foreground'
              )}
            >
              <span className="truncate text-left">{isLoading ? 'Loading tags…' : triggerLabel}</span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-60 transition-transform', open && 'rotate-180')} />
            </button>
          </DropdownMenuTrigger>
        </div>

        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] p-0 bg-card"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div
            className="border-b border-border p-2 bg-card"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCreateError('')
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search or type new tag, press Enter"
              className="h-8 bg-background"
              autoComplete="off"
              disabled={createMutation.isPending}
            />
          </div>

          <div className="max-h-52 overflow-y-auto bg-card py-1">
            {filteredTags.length === 0 && !showCreateOption ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No tags found.</p>
            ) : (
              filteredTags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id)
                return (
                  <DropdownMenuItem
                    key={tag.id}
                    className="cursor-pointer bg-card focus:bg-muted"
                    onSelect={(e) => {
                      e.preventDefault()
                      toggleTag(tag.id)
                    }}
                  >
                    <span
                      className={cn(
                        'mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    {tag.name}
                  </DropdownMenuItem>
                )
              })
            )}
            {showCreateOption && (
              <DropdownMenuItem
                className="cursor-pointer text-primary bg-card focus:bg-muted"
                onSelect={(e) => {
                  e.preventDefault()
                  createFromSearch()
                }}
              >
                Create &ldquo;{search.trim()}&rdquo;
              </DropdownMenuItem>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

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
