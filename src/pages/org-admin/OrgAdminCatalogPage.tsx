import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getSupabase } from '@/services/supabase'
import { publishCourseToOrg } from '@/services/course-publications.service'
import { fetchOrgLicense } from '@/services/org-license.service'
import { useAuthStore } from '@/store/authStore'

type CatalogCourse = {
  id: string
  title: string
  description: string | null
  estimated_minutes: number | null
  is_monthly_catalog: boolean
}

async function fetchMonthlyCatalog(): Promise<CatalogCourse[]> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Backend is not configured.')
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, description, estimated_minutes, is_monthly_catalog')
    .eq('is_monthly_catalog', true)
    .order('title')
  if (error) throw error
  return (data ?? []) as CatalogCourse[]
}

export function OrgAdminCatalogPage() {
  const profile = useAuthStore((s) => s.profile)
  const userId = useAuthStore((s) => s.userId)!
  const orgId = profile?.org_id
  const queryClient = useQueryClient()

  const { data: license } = useQuery({
    queryKey: ['org-license', orgId],
    queryFn: () => fetchOrgLicense(orgId!),
    enabled: Boolean(orgId),
  })

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['monthly-catalog'],
    queryFn: fetchMonthlyCatalog,
    enabled: license?.lms_enabled !== false,
  })

  const { data: publications = [] } = useQuery({
    queryKey: ['org-publications', orgId],
    queryFn: async () => {
      const supabase = getSupabase()
      if (!supabase || !orgId) return []
      const { data, error } = await supabase
        .from('course_publications')
        .select('course_id')
        .eq('org_id', orgId)
        .is('unpublished_at', null)
      if (error) throw error
      return (data ?? []).map((r) => r.course_id as string)
    },
    enabled: Boolean(orgId),
  })

  const subscribeMutation = useMutation({
    mutationFn: (courseId: string) =>
      publishCourseToOrg({
        courseId,
        orgId: orgId!,
        publishedBy: userId,
        availableDays: null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['org-publications', orgId] })
      void queryClient.invalidateQueries({ queryKey: ['org-users', orgId] })
    },
  })

  if (license && license.lms_enabled === false) {
    return (
      <div className="space-y-4">
        <PageHeader title="Security catalog" description="LMS is not enabled for your organization." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly security catalog"
        description="Subscribe your organization to KeyTrain Learning security courses. Staff receive required assignments automatically."
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading catalog…</p>}

      {!isLoading && courses.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No monthly catalog courses yet. Ask a KeyTrain Learning admin to enable “Monthly
            security catalog” when editing a platform course.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((course) => {
          const subscribed = publications.includes(course.id)
          return (
            <Card key={course.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {course.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {course.description || 'Security awareness course from KeyTrain Learning.'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {course.estimated_minutes != null && (
                    <Badge variant="outline">{course.estimated_minutes} min</Badge>
                  )}
                  {subscribed ? (
                    <Badge>Subscribed</Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={subscribeMutation.isPending}
                      onClick={() => subscribeMutation.mutate(course.id)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add to my org
                    </Button>
                  )}
                </div>
                {subscribeMutation.isError && subscribeMutation.variables === course.id && (
                  <p className="text-sm text-destructive">
                    {(subscribeMutation.error as Error).message}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
