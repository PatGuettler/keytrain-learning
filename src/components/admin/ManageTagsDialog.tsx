import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, X } from 'lucide-react'
import {
  createTrainingTag,
  deleteTrainingTag,
  fetchTrainingTags,
  updateTrainingTag,
} from '@/services/training-tags.service'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TrainingTag } from '@/types/training-tag.types'

type ManageTagsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTagDeleted?: (tagId: string) => void
}

export function ManageTagsDialog({ open, onOpenChange, onTagDeleted }: ManageTagsDialogProps) {
  const queryClient = useQueryClient()
  const [newTagName, setNewTagName] = useState('')
  const [createError, setCreateError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['training-tags'],
    queryFn: fetchTrainingTags,
    enabled: open,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['training-tags'] })
    void queryClient.invalidateQueries({ queryKey: ['hospital-courses'] })
    void queryClient.invalidateQueries({ queryKey: ['course'] })
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => createTrainingTag(name),
    onSuccess: () => {
      setNewTagName('')
      setCreateError('')
      invalidate()
    },
    onError: (e: Error) => setCreateError(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateTrainingTag(id, name),
    onSuccess: () => {
      setEditingId(null)
      setEditName('')
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTrainingTag,
    onSuccess: (_data, tagId) => {
      onTagDeleted?.(tagId)
      invalidate()
    },
  })

  const submitNewTag = () => {
    const trimmed = newTagName.trim()
    if (!trimmed) return
    createMutation.mutate(trimmed)
  }

  const handleDelete = (tag: TrainingTag) => {
    const confirmed = window.confirm(
      `Delete tag "${tag.name}"? It will be removed from all courses and organizations.`
    )
    if (!confirmed) return
    deleteMutation.mutate(tag.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
          <DialogDescription>
            Create, rename, or delete tags. Type a name and press Enter to add one.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            submitNewTag()
          }}
        >
          <Label htmlFor="manage-new-tag">New tag</Label>
          <Input
            id="manage-new-tag"
            value={newTagName}
            onChange={(e) => {
              setNewTagName(e.target.value)
              setCreateError('')
            }}
            placeholder="e.g. Healthcare — press Enter to save"
            disabled={createMutation.isPending}
          />
          {createError && <p className="text-sm text-destructive">{createError}</p>}
        </form>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading tags…</p>
        ) : tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet.</p>
        ) : (
          <ul className="divide-y rounded-md border max-h-64 overflow-y-auto">
            {tags.map((tag) => (
              <li key={tag.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                {editingId === tag.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 min-w-[8rem]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editName.trim()) {
                          e.preventDefault()
                          updateMutation.mutate({ id: tag.id, name: editName })
                        }
                        if (e.key === 'Escape') {
                          setEditingId(null)
                          setEditName('')
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!editName.trim() || updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: tag.id, name: editName })}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null)
                        setEditName('')
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium flex-1">{tag.name}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Edit ${tag.name}`}
                      onClick={() => {
                        setEditingId(tag.id)
                        setEditName(tag.name)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      aria-label={`Delete ${tag.name}`}
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(tag)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
