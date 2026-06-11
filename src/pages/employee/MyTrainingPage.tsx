import { CourseListPage } from '@/pages/training/CourseListPage'

export function MyTrainingPage({ basePath = '/employee/training' }: { basePath?: string }) {
  return <CourseListPage basePath={basePath} />
}
