import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { railnetAssignmentToCourseBundle } from '@/lib/railnet-assignment-to-course'
import { trainingSummary } from '@/lib/railnet-records'
import {
  createCourseStagingRow,
  fetchCourseStagingRows,
  publishStagedCourse,
  rejectStagedCourse,
} from '@/services/course-staging.service'
import { useAuthStore } from '@/store/authStore'
import type { RailNetRecord } from '@/types/railnet.types'
import type { CourseStagingRow } from '@/types/railnet-staging.types'

type RailNetCourseStagingPanelProps = {
  trainingAssignments: RailNetRecord[]
}

function assignmentKey(record: RailNetRecord): string {
  return `${record.pk ?? ''}|${record.sk ?? ''}`
}

export function RailNetCourseStagingPanel({ trainingAssignments }: RailNetCourseStagingPanelProps) {
  const userId = useAuthStore((s) => s.userId)!
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState('')
  const [actionError, setActionError] = useState('')

  const { data: stagingRows = [], isLoading } = useQuery({
    queryKey: ['course-staging'],
    queryFn: fetchCourseStagingRows,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['course-staging'] })

  const stageMutation = useMutation({
    mutationFn: async (assignment: RailNetRecord) => {
      const bundle = railnetAssignmentToCourseBundle(assignment)
      return createCourseStagingRow({
        railnet_org_id: String(assignment.railnet_org_id ?? ''),
        source_assignment_sk: assignment.sk ? String(assignment.sk) : undefined,
        source_trend_report_sk: assignment.trend_report_sk
          ? String(assignment.trend_report_sk)
          : undefined,
        title: bundle.course.title,
        proposed_content: bundle,
        created_by: userId,
      })
    },
    onSuccess: () => {
      setActionError('')
      void invalidate()
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const publishMutation = useMutation({
    mutationFn: (stagingId: string) => publishStagedCourse(stagingId, userId),
    onSuccess: (result) => {
      setActionError('')
      void invalidate()
      navigate(`/admin/courses/${result.courseId}/edit`)
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const rejectMutation = useMutation({
    mutationFn: rejectStagedCourse,
    onSuccess: () => {
      setActionError('')
      void invalidate()
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const selectedAssignment = trainingAssignments.find(
    (a) => assignmentKey(a) === selectedAssignmentKey
  )

  const openInBuilder = (row: CourseStagingRow) => {
    navigate('/admin/courses/create', {
      state: {
        railnetImportBundle: row.proposed_content,
        railnetStagingId: row.id,
      },
    })
  }

  const pendingRows = stagingRows.filter((r) => r.status === 'pending_review')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Import from AWS training assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Transform a RailNet monthly assignment into a{' '}
            <code className="text-xs">CourseExportBundle</code> for review in Course Builder.
          </p>
          {trainingAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No training assignments in the current filter.</p>
          ) : (
            <>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedAssignmentKey}
                onChange={(e) => setSelectedAssignmentKey(e.target.value)}
              >
                <option value="">Select assignment…</option>
                {trainingAssignments.map((record) => (
                  <option key={assignmentKey(record)} value={assignmentKey(record)}>
                    {String(record.railnet_org_id)} · {trainingSummary(record)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={!selectedAssignment || stageMutation.isPending}
                onClick={() => selectedAssignment && stageMutation.mutate(selectedAssignment)}
              >
                Stage course for review
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staged courses ({pendingRows.length} pending)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading staging queue…</p>
          ) : stagingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No staged courses yet. Apply migration 035 if tables are missing, then import an assignment
              above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Org</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stagingRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2 max-w-xs truncate">{row.title}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{row.railnet_org_id}</Badge>
                      </td>
                      <td className="px-3 py-2 capitalize">{row.status.replace('_', ' ')}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-[10rem] truncate">
                        {row.source_assignment_sk ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.status === 'pending_review' && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openInBuilder(row)}
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={publishMutation.isPending}
                                onClick={() => publishMutation.mutate(row.id)}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Publish
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={rejectMutation.isPending}
                                onClick={() => rejectMutation.mutate(row.id)}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {row.published_course_id && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/admin/courses/${row.published_course_id}/edit`)}
                            >
                              Open course
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}
    </div>
  )
}
