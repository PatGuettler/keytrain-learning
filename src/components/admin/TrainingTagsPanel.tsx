import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  createTrainingTag,
  deleteTrainingTag,
  fetchTrainingTags,
  updateTrainingTag,
} from '@/services/training-tags.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function TrainingTagsPanel() {
  const queryClient = useQueryClient()
  const [newTagName, setNewTagName] = useState('')
  const [createError, setCreateError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['training-tags'],
    queryFn: fetchTrainingTags,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['training-tags'] })
    void queryClient.invalidateQueries({ queryKey: ['hospital-courses'] })
    void queryClient.invalidateQueries({ queryKey: ['course'] })
  }

  const createMutation = useMutation({
    mutationFn: () => createTrainingTag(newTagName),
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
    onSuccess: invalidate,
  })

  const startEdit = (id: string, name: string) => {
    setEditingId(id)
    setEditName(name)
  }

  const handleDelete = (id: string, name: string) => {
    const confirmed = window.confirm(
      `Delete tag "${name}"? It will be removed from all courses and organizations.`
    )
    if (!confirmed) return
    deleteMutation.mutate(id)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Training tags</CardTitle>
        <p className="text-sm text-muted-foreground">
          Create industry or topic tags. Courses and organizations can have multiple tags.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newTagName.trim()) return
            createMutation.mutate()
          }}
        >
          <div className="space-y-1 min-w-[12rem] flex-1">
            <Label htmlFor="new-tag-name">New tag</Label>
            <Input
              id="new-tag-name"
              value={newTagName}
              onChange={(e) => {
                setNewTagName(e.target.value)
                setCreateError('')
              }}
              placeholder="e.g. Healthcare"
            />
          </div>
          <Button type="submit" disabled={!newTagName.trim() || createMutation.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            {createMutation.isPending ? 'Adding…' : 'Add tag'}
          </Button>
        </form>
        {createError && <p className="text-sm text-destructive">{createError}</p>}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading tags…</p>
        ) : tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet. Add one above.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {tags.map((tag) => (
              <li key={tag.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                {editingId === tag.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="max-w-xs"
                      autoFocus
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
                      onClick={() => startEdit(tag.id, tag.name)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(tag.id, tag.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
