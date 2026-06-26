import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Settings2 } from 'lucide-react'
import { createTrainingTag, fetchTrainingTags } from '@/services/training-tags.service'
import { ManageTagsDialog } from '@/components/admin/ManageTagsDialog'
import { Button } from '@/components/ui/button'
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

type MenuPosition = {
  top: number
  left: number
  width: number
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [createError, setCreateError] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0, width: 0 })

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

  const updateMenuPosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setMenuPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }

  useEffect(() => {
    if (!open) return
    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
      setSearch('')
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open])

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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
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
    if (e.key === 'Escape') {
      setOpen(false)
      setSearch('')
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

  const menu = open ? (
    <div
      ref={menuRef}
      role="listbox"
      aria-multiselectable
      className="fixed z-[200] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-xl"
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
        width: menuPosition.width,
        backgroundColor: 'hsl(var(--card))',
      }}
    >
      <div
        className="border-b border-border p-2"
        style={{ backgroundColor: 'hsl(var(--card))' }}
      >
        <Input
          ref={searchRef}
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

      <ul
        className="max-h-52 overflow-y-auto py-1"
        style={{ backgroundColor: 'hsl(var(--card))' }}
      >
        {filteredTags.length === 0 && !showCreateOption ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">No tags found.</li>
        ) : (
          filteredTags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id)
            return (
              <li key={tag.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted"
                  style={{ backgroundColor: 'hsl(var(--card))' }}
                  onClick={() => toggleTag(tag.id)}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background'
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  {tag.name}
                </button>
              </li>
            )
          })
        )}
        {showCreateOption && (
          <li>
            <button
              type="button"
              className="w-full px-3 py-2 text-sm text-left text-primary hover:bg-muted"
              style={{ backgroundColor: 'hsl(var(--card))' }}
              onClick={() => createMutation.mutate(search.trim())}
            >
              Create &ldquo;{search.trim()}&rdquo;
            </button>
          </li>
        )}
      </ul>
    </div>
  ) : null

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

      <div className="max-w-md">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={isLoading}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            selectedTags.length === 0 && 'text-muted-foreground'
          )}
          onClick={() => {
            setOpen((prev) => {
              const next = !prev
              if (next) updateMenuPosition()
              return next
            })
          }}
        >
          <span className="truncate text-left">{isLoading ? 'Loading tags…' : triggerLabel}</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-60 transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {createError && <p className="text-sm text-destructive">{createError}</p>}

      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}

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
