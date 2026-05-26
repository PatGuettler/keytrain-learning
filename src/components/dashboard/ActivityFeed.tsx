import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Activity {
  user: string
  action: string
  course: string
  at: string
}

export function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex justify-between text-sm border-b pb-2 last:border-0">
              <span>
                <strong>{item.user}</strong> {item.action} <em>{item.course}</em>
              </span>
              <span className="text-muted-foreground shrink-0 ml-2">{item.at}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
