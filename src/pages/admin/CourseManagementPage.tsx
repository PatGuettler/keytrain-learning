import { Link } from 'react-router-dom'
import { useCourses } from '@/hooks/useCourses'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'

export function CourseManagementPage() {
  const { data: courses = [] } = useCourses(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Course Management</h2>
        <Button asChild>
          <Link to="/admin/courses/new">
            <Plus className="h-4 w-4 mr-1" /> New Course
          </Link>
        </Button>
      </div>
      <div className="space-y-3">
        {courses.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-lg">{c.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{c.estimated_minutes} min</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={c.is_published ? 'success' : 'secondary'}>
                  {c.is_published ? 'Published' : 'Draft'}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/courses/${c.id}/edit`}>Edit</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
