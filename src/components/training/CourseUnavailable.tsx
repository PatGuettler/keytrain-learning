import { Link } from 'react-router-dom'
import { BookX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function CourseUnavailable({ trainingPath }: { trainingPath: string }) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardContent className="flex flex-col items-center text-center gap-4 py-10 px-6">
        <BookX className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Course no longer available</h2>
          <p className="text-sm text-muted-foreground">
            This course has been removed or the deadline to complete it has passed. You can no longer
            start or continue it.
          </p>
        </div>
        <Button asChild>
          <Link to={trainingPath}>Back to My Training</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
