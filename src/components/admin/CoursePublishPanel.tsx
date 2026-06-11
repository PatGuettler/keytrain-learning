import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchHospitalOrganizations } from '@/services/organizations.service'
import {
  fetchPublicationsForCourse,
  publishCourseToOrg,
  setCourseAvailability,
  unpublishCourseEverywhere,
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

  const activePublications = publications.filter(isActive)
  const selectedPub = publications.find((p) => p.org_id === orgId)
  const activePub = selectedPub && isActive(selectedPub)
  const unpublishedOrgs = new Set(
    publications.filter((p) => p.unpublished_at).map((p) => p.org_id)
  )

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['course-publications', courseId] }),
      queryClient.invalidateQueries({ queryKey: ['all-course-publications'] }),
      queryClient.invalidateQueries({ queryKey: ['courses'] }),
      queryClient.invalidateQueries({ queryKey: ['hospital-courses'] }),
      queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
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

  const handleUnpublishOrg = (targetOrgId: string, hospitalName: string) => {
    const confirmed = window.confirm(
      `Unpublish this course from ${hospitalName}? Staff will no longer see or start it. Completed records are kept.`
    )
    if (!confirmed) return
    void run(async () => {
      await unpublishCourseFromOrg(courseId, targetOrgId)
    })
  }

  const handleUnpublishAll = () => {
    if (activePublications.length === 0) return
    const confirmed = window.confirm(
      `Unpublish this course from all ${activePublications.length} hospital(s)? No staff will be able to take it until you publish again.`
    )
    if (!confirmed) return
    void run(async () => {
      await unpublishCourseEverywhere(courseId)
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
        <CardTitle className="text-base">Publish &amp; unpublish</CardTitle>
        <CardDescription>
          Publishing makes this course required for every manager and employee in the selected
          hospital. Unpublishing removes it from their training catalog immediately — they cannot
          start or continue it (completed records are kept).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {activePublications.length > 0 && (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Currently published to</p>
              {activePublications.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={loading}
                  onClick={handleUnpublishAll}
                >
                  Unpublish from all hospitals
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {activePublications.map((pub) => {
                const org = hospitals.find((h) => h.id === pub.org_id)
                return (
                  <li
                    key={pub.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{org?.name ?? pub.org_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Since {formatDate(pub.published_at)}
                        {pub.available_until
                          ? ` · take by ${formatDate(pub.available_until)}`
                          : ' · no deadline'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      disabled={loading}
                      onClick={() => handleUnpublishOrg(pub.org_id, org?.name ?? 'this hospital')}
                    >
                      Unpublish
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="publish-org">Publish to hospital</Label>
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
                {activePublications.some((p) => p.org_id === h.id)
                  ? ' (published)'
                  : unpublishedOrgs.has(h.id)
                    ? ' (previously unpublished)'
                    : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedPub && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Selected hospital</span>
              {activePub ? (
                <Badge variant="success">Published</Badge>
              ) : selectedPub.unpublished_at ? (
                <Badge variant="secondary">Unpublished</Badge>
              ) : (
                <Badge variant="secondary">Expired</Badge>
              )}
            </div>
            {selectedPub.unpublished_at && (
              <p className="text-muted-foreground">
                Unpublished {formatDate(selectedPub.unpublished_at)}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Availability deadline</Label>
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
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {!activePub && (
            <Button type="button" disabled={loading || !orgId} onClick={handlePublish}>
              {loading ? 'Publishing…' : 'Publish to organization'}
            </Button>
          )}
          {activePub && (
            <Button type="button" variant="outline" disabled={loading || !orgId} onClick={handleSetDeadline}>
              {loading ? 'Saving…' : 'Update deadline'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
