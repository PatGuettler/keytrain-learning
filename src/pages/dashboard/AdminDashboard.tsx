import { Users, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { CompletionChart } from '@/components/dashboard/CompletionChart'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const scoreData = [
  { course: 'Clinical Incidents', score: 88 },
  { course: 'Cybersecurity', score: 82 },
]

export function AdminDashboard() {
  const stats = useDashboardStats('admin')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Organization Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard title="Courses" value={`${stats.publishedCourses}/${stats.totalCourses}`} subtitle="published" icon={BookOpen} />
        <StatCard title="Completion Rate" value={`${stats.completionRate}%`} icon={TrendingUp} />
        <StatCard title="Overdue" value={stats.overdueCount} icon={AlertTriangle} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <CompletionChart completed={stats.completionRate} remaining={100 - stats.completionRate} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avg Quiz Score by Course</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="course" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <ActivityFeed items={stats.recentActivity} />
    </div>
  )
}
