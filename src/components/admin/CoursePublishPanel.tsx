import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchHospitalOrganizations } from '@/services/organizations.service'
import {
  fetchPublicationsForCourse,
  publishCourseToOrgs,
  setCourseAvailabilityForOrgs,
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

function orgStatusLabel(
  orgId: string,
  activePublications: CoursePublication[],
  unpublishedOrgs: Set<string>
): string | null {
  if (activePublications.some((p) => p.org_id === orgId)) return 'published'
  if (unpublishedOrgs.has(orgId)) return 'previously unpublished'
  return null
}

export function CoursePublishPanel({
  courseId,
  publishedBy,
}: {
  courseId: string
  publishedBy: string
}) {
  const queryClient = useQueryClient()
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set())
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
  const activeOrgIds = useMemo(
    () => new Set(activePublications.map((p) => p.org_id)),
    [activePublications]
  )
  const unpublishedOrgs = new Set(
    publications.filter((p) => p.unpublished_at).map((p) => p.org_id)
  )

  const allSelected = hospitals.length > 0 && selectedOrgIds.size === hospitals.length
  const selectedIds = useMemo(() => Array.from(selectedOrgIds), [selectedOrgIds])
  const selectedToPublish = selectedIds.filter((id) => !activeOrgIds.has(id))
  const selectedToUpdate = selectedIds.filter((id) => activeOrgIds.has(id))

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

  const toggleOrg = (orgId: string, checked: boolean) => {
    setSelectedOrgIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(orgId)
      else next.delete(orgId)
      return next
    })
    setError('')
  }

  const toggleAll = (checked: boolean) => {
    setSelectedOrgIds(checked ? new Set(hospitals.map((h) => h.id)) : new Set())
    setError('')
  }

  const availableDaysValue =
    deadlineMode === 'days' ? Math.max(1, parseInt(availableDays, 10) || 1) : null

  const handleApply = () => {
    if (selectedIds.length === 0) {
      setError('Select at least one organization.')
      return
    }
    void run(async () => {
      if (selectedToPublish.length > 0) {
        await publishCourseToOrgs(courseId, selectedToPublish, publishedBy, availableDaysValue)
      }
      if (selectedToUpdate.length > 0) {
        await setCourseAvailabilityForOrgs(courseId, selectedToUpdate, availableDaysValue)
      }
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

  const actionLabel = (() => {
    if (selectedToPublish.length > 0 && selectedToUpdate.length > 0) {
      return `Publish & update ${selectedIds.length} organization${selectedIds.length === 1 ? '' : 's'}`
    }
    if (selectedToPublish.length > 0) {
      return `Publish to ${selectedToPublish.length} organization${selectedToPublish.length === 1 ? '' : 's'}`
    }
    if (selectedToUpdate.length > 0) {
      return `Update deadline for ${selectedToUpdate.length} organization${selectedToUpdate.length === 1 ? '' : 's'}`
    }
    return 'Apply to selected'
  })()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Publish &amp; unpublish</CardTitle>
        <CardDescription>
          Publishing makes this course required for every manager and employee in the selected
          hospitals. Unpublishing removes it from their training catalog immediately — they cannot
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

        <div className="space-y-3">
          <Label>Publish to hospitals</Label>
          <label className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
            />
            All organizations
          </label>
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
            {hospitals.map((h) => {
              const status = orgStatusLabel(h.id, activePublications, unpublishedOrgs)
              const checked = selectedOrgIds.has(h.id)
              return (
                <li key={h.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent/50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-input"
                      checked={checked}
                      onChange={(e) => toggleOrg(h.id, e.target.checked)}
                    />
                    <span className="min-w-0 flex-1 truncate">{h.name}</span>
                    {status === 'published' && (
                      <Badge variant="success" className="shrink-0 text-xs">
                        Published
                      </Badge>
                    )}
                    {status === 'previously unpublished' && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        Unpublished
                      </Badge>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
          {selectedIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} selected
              {selectedToPublish.length > 0 && selectedToUpdate.length > 0
                ? ` · ${selectedToPublish.length} to publish, ${selectedToUpdate.length} to update`
                : selectedToPublish.length > 0
                  ? ` · ${selectedToPublish.length} not yet published`
                  : ` · all already published (deadline update only)`}
            </p>
          )}
        </div>

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
          <Button
            type="button"
            disabled={loading || selectedIds.length === 0}
            onClick={handleApply}
          >
            {loading ? 'Applying…' : actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
