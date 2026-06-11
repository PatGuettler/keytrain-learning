import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TrainingNeed } from '@/lib/dashboard-stats'

export function OrgTrainingNeedsPanel({ needs }: { needs: TrainingNeed[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Training needs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {needs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No significant gaps yet — staff are passing modules at a healthy rate.
          </p>
        ) : (
          <ul className="space-y-4">
            {needs.slice(0, 8).map((need) => (
              <li key={need.moduleId} className="rounded-lg border p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{need.moduleTitle}</p>
                    <p className="text-xs text-muted-foreground">{need.courseTitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={need.passRate < 50 ? 'destructive' : 'warning'}>
                      {need.passRate}% pass
                    </Badge>
                    <Badge variant="outline">{need.avgScore}% avg</Badge>
                    <Badge variant="secondary">{need.attemptCount} attempts</Badge>
                  </div>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  {need.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/courses/${need.courseId}/edit`}>Edit course</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
