import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchHospitalOrganizations } from '@/services/organizations.service'
import {
  fetchPublicationsForCourse,
  publishCourseToOrg,
  setCourseAvailability,
  unpublishCourseFromOrg,
} from '@/services/course-publications.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { CoursePublication } from '@/types/course.types'

function isActive(pub: CoursePublication): boolean {
  if (pub.unpublished_at) return false
  if (pub.available_until && new Date(pub.available_until) <= new Date()) return false
  return true
}

export function CoursePublishPanel({
  courseId,
  publishedBy,
}: {
  courseId: string
  publishedBy: string
}) {
  const queryClient = useQueryClient()
  const [orgId, setOrgId] = useState('')
  const [deadlineMode, setDeadlineMode] = useState<'none' | 'days'>('none')
  const [availableDays, setAvailableDays] = useState('14')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: hospitals = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchHospitalOrganizations,
  })

  const { data: publications = [] } = useQuery({
    queryKey: ['course-publications', courseId],
    queryFn: () => fetchPublicationsForCourse(courseId),
  })

  const selectedPub = publications.find((p) => p.org_id === orgId)
  const activePub = selectedPub && isActive(selectedPub)

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['course-publications', courseId] }),
      queryClient.invalidateQueries({ queryKey: ['courses'] }),
      queryClient.invalidateQueries({ queryKey: ['course-notices'] }),
      queryClient.invalidateQueries({ queryKey: ['assignments'] }),
    ])
  }

  const run = async (fn: () => Promise<void>) => {
    setLoading(true)
    setError('')
    try {
      await fn()
      await invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = () => {
    if (!orgId) {
      setError('Select a hospital organization.')
      return
    }
    const days =
      deadlineMode === 'days' ? Math.max(1, parseInt(availableDays, 10) || 1) : null
    void run(async () => {
      await publishCourseToOrg({
        courseId,
        orgId,
        publishedBy,
        availableDays: days,
      })
    })
  }

  const handleUnpublishNow = () => {
    if (!orgId) return
    void run(async () => {
      await unpublishCourseFromOrg(courseId, orgId)
    })
  }

  const handleSetDeadline = () => {
    if (!orgId) return
    const days =
      deadlineMode === 'days' ? Math.max(1, parseInt(availableDays, 10) || 1) : null
    void run(async () => {
      if (activePub) {
        await setCourseAvailability(courseId, orgId, days)
      } else {
        await publishCourseToOrg({ courseId, orgId, publishedBy, availableDays: days })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Publish to organization</CardTitle>
        <CardDescription>
          Publishing makes this course required for every manager and employee in the hospital — not
          a frozen copy. All staff receive the assignment automatically; managers do not assign
          courses manually. Optionally set when the course will be removed from their catalog.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="publish-org">Hospital</Label>
          <select
            id="publish-org"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={orgId}
            onChange={(e) => {
              setOrgId(e.target.value)
              setError('')
            }}
          >
            <option value="">Select organization…</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {selectedPub && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status</span>
              {activePub ? (
                <Badge variant="success">Published</Badge>
              ) : selectedPub.unpublished_at ? (
                <Badge variant="secondary">Unpublished</Badge>
              ) : (
                <Badge variant="secondary">Expired</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Published {formatDate(selectedPub.published_at)}
            </p>
            {activePub && selectedPub.available_until && (
              <p className="text-amber-700 dark:text-amber-400 font-medium">
                Take by {formatDate(selectedPub.available_until)}
              </p>
            )}
            {activePub && !selectedPub.available_until && (
              <p className="text-muted-foreground">No removal deadline</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Availability</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="deadline"
                checked={deadlineMode === 'none'}
                onChange={() => setDeadlineMode('none')}
              />
              No removal deadline
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="deadline"
                checked={deadlineMode === 'days'}
                onChange={() => setDeadlineMode('days')}
              />
              Remove in
              <Input
                type="number"
                min={1}
                className="w-20 h-8"
                value={availableDays}
                disabled={deadlineMode !== 'days'}
                onChange={(e) => setAvailableDays(e.target.value)}
              />
              days
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Staff will see &quot;Take by [date]&quot; when a deadline is set.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {!activePub && (
            <Button type="button" disabled={loading || !orgId} onClick={handlePublish}>
              {loading ? 'Publishing…' : 'Publish to organization'}
            </Button>
          )}
          {activePub && (
            <>
              <Button type="button" variant="outline" disabled={loading || !orgId} onClick={handleSetDeadline}>
                {loading ? 'Saving…' : 'Update deadline'}
              </Button>
              <Button type="button" variant="destructive" disabled={loading || !orgId} onClick={handleUnpublishNow}>
                {loading ? 'Removing…' : 'Unpublish now'}
              </Button>
            </>
          )}
        </div>

        {publications.filter(isActive).length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Active publications</p>
            <ul className="text-sm space-y-1">
              {publications.filter(isActive).map((p) => {
                const org = hospitals.find((h) => h.id === p.org_id)
                return (
                  <li key={p.id}>
                    {org?.name ?? p.org_id}
                    {p.available_until ? ` — take by ${formatDate(p.available_until)}` : ' — no deadline'}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
