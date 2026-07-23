import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TrainingNeed } from '@/lib/dashboard-stats'

export function OrgTrainingNeedsPanel({
  needs,
  orgSlug,
  highlightModuleId,
  /** When true (course detail page), show summary only — no navigation. */
  disableNavigation = false,
  onResolve,
  resolvingModuleId,
}: {
  needs: TrainingNeed[]
  orgSlug: string
  highlightModuleId?: string | null
  disableNavigation?: boolean
  onResolve?: (moduleId: string) => void
  resolvingModuleId?: string | null
}) {
  const navigate = useNavigate()

  const openCourse = (need: TrainingNeed) => {
    navigate(`/admin/dashboard/${orgSlug}/courses/${need.courseId}?module=${need.moduleId}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Training needs
        </CardTitle>
        <CardDescription>
          {disableNavigation
            ? 'Quiz/module results for this course — pass rate and missed questions (not the same as course attempts below). Open a staff member for per-person scores and mistakes.'
            : 'Click a module to open that course’s training data. Mark resolved when you have addressed a gap — it will no longer appear here.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {needs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No significant gaps yet — staff are passing modules at a healthy rate.
          </p>
        ) : (
          <ul className="space-y-3">
            {needs.slice(0, 8).map((need) => {
              const content = (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground">{need.moduleTitle}</p>
                      <p className="text-xs text-muted-foreground">{need.courseTitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center shrink-0">
                      <Badge variant={need.passRate < 50 ? 'destructive' : 'warning'}>
                        {need.passRate}% pass
                      </Badge>
                      <Badge variant="outline">{need.avgScore}% avg</Badge>
                      <Badge
                        variant="secondary"
                        title="Times this quiz/module was submitted (not course attempts)"
                      >
                        {need.attemptCount} quiz {need.attemptCount === 1 ? 'take' : 'takes'}
                      </Badge>
                      {!disableNavigation && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    {need.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {!disableNavigation && (
                      <p className="text-xs text-primary">View training data →</p>
                    )}
                    {onResolve ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={resolvingModuleId === need.moduleId}
                        onClick={(e) => {
                          e.stopPropagation()
                          onResolve(need.moduleId)
                        }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {resolvingModuleId === need.moduleId ? 'Saving…' : 'Mark resolved'}
                      </Button>
                    ) : null}
                  </div>
                </>
              )

              const className = cn(
                'w-full rounded-lg border p-4 text-left space-y-2',
                !disableNavigation && 'hover:bg-muted/50 transition-colors',
                highlightModuleId === need.moduleId && 'ring-2 ring-primary/40 border-primary/40'
              )

              return (
                <li key={need.moduleId}>
                  {disableNavigation ? (
                    <div className={className}>{content}</div>
                  ) : (
                    <button type="button" onClick={() => openCourse(need)} className={className}>
                      {content}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
