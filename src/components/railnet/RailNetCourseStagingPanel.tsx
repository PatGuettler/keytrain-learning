import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, ExternalLink, CheckCircle, XCircle, Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { railnetAssignmentToCourseBundle } from '@/lib/railnet-assignment-to-course'
import { getSuggestedTrainingTopics, trainingSummary } from '@/lib/railnet-records'
import {
  createCourseStagingRow,
  fetchCourseStagingRows,
  publishStagedCourse,
  rejectStagedCourse,
} from '@/services/course-staging.service'
import { isKtlAdmin } from '@/services/org-license.service'
import { useAuthStore } from '@/store/authStore'
import type { RailNetRecord } from '@/types/railnet.types'
import type { CourseStagingRow } from '@/types/railnet-staging.types'

type RailNetCourseStagingPanelProps = {
  trainingAssignments: RailNetRecord[]
  trendReports?: RailNetRecord[]
  lockedOrgId?: string | null
  /** Where to send KTL admins after publish; org admins go to catalog */
  courseEditBasePath?: string
}

function assignmentKey(record: RailNetRecord): string {
  return `${record.pk ?? ''}|${record.sk ?? ''}`
}

export function RailNetCourseStagingPanel({
  trainingAssignments,
  trendReports = [],
  lockedOrgId = null,
  courseEditBasePath = '/admin/courses',
}: RailNetCourseStagingPanelProps) {
  const profile = useAuthStore((s) => s.profile)
  const userId = useAuthStore((s) => s.userId)!
  const ktlAdmin = isKtlAdmin(profile)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState('')
  const [actionError, setActionError] = useState('')

  const assignments = useMemo(() => {
    if (!lockedOrgId) return trainingAssignments
    return trainingAssignments.filter((a) => String(a.railnet_org_id ?? '') === lockedOrgId)
  }, [trainingAssignments, lockedOrgId])

  const suggestedTopics = useMemo(
    () => getSuggestedTrainingTopics(trendReports),
    [trendReports]
  )

  const { data: stagingRows = [], isLoading } = useQuery({
    queryKey: ['course-staging', lockedOrgId ?? 'all'],
    queryFn: fetchCourseStagingRows,
  })

  const visibleRows = useMemo(() => {
    if (!lockedOrgId) return stagingRows
    return stagingRows.filter((r) => r.railnet_org_id === lockedOrgId)
  }, [stagingRows, lockedOrgId])

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
    mutationFn: (stagingId: string) =>
      publishStagedCourse(
        stagingId,
        userId,
        ktlAdmin
          ? undefined
          : {
              orgId: profile!.org_id,
              assignToOrg: true,
            }
      ),
    onSuccess: (result) => {
      setActionError('')
      void invalidate()
      if (ktlAdmin) {
        navigate(`${courseEditBasePath}/${result.courseId}/edit`)
      } else {
        navigate('/org-admin/training-reports')
      }
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

  const selectedAssignment = assignments.find((a) => assignmentKey(a) === selectedAssignmentKey)

  const openInBuilder = (row: CourseStagingRow) => {
    if (!ktlAdmin) {
      setActionError('Publishing assigns the staged course to your organization. Use Publish to apply.')
      return
    }
    navigate(`${courseEditBasePath}/create`, {
      state: {
        railnetImportBundle: row.proposed_content,
        railnetStagingId: row.id,
      },
    })
  }

  const pendingRows = visibleRows.filter((r) => r.status === 'pending_review')

  return (
    <div className="space-y-4">
      {suggestedTopics.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Suggested training topics from recent trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              {suggestedTopics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Use these weak domains and leadership recommendations when staging or choosing catalog
              courses.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Import from AWS training assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Stage a RailNet monthly assignment as a course draft
            {ktlAdmin ? ' for Course Builder review.' : ', then publish it to your organization.'}
          </p>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No training assignments in the current filter.</p>
          ) : (
            <>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedAssignmentKey}
                onChange={(e) => setSelectedAssignmentKey(e.target.value)}
              >
                <option value="">Select assignment…</option>
                {assignments.map((record) => (
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
          ) : visibleRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No staged courses yet. Import an assignment above to start.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Org</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2 max-w-xs truncate">{row.title}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{row.railnet_org_id}</Badge>
                      </td>
                      <td className="px-3 py-2 capitalize">{row.status.replace('_', ' ')}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.status === 'pending_review' && (
                            <>
                              {ktlAdmin && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openInBuilder(row)}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                disabled={publishMutation.isPending}
                                onClick={() => publishMutation.mutate(row.id)}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                {ktlAdmin ? 'Publish' : 'Publish to my org'}
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
                          {row.published_course_id && ktlAdmin && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(`${courseEditBasePath}/${row.published_course_id}/edit`)
                              }
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
