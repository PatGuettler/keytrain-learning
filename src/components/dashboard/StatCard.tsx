import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  className?: string
  to?: string
  onClick?: () => void
}

function StatCardInner({
  title,
  value,
  subtitle,
  icon: Icon,
}: Pick<StatCardProps, 'title' | 'value' | 'subtitle' | 'icon'>) {
  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </>
  )
}

export function StatCard({ title, value, subtitle, icon, className, to, onClick }: StatCardProps) {
  const hoverClass =
    'transition-colors hover:bg-accent/40 hover:border-primary/30 cursor-pointer'

  if (to) {
    return (
      <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
        <Card className={cn(className, hoverClass)}>
          <StatCardInner title={title} value={value} subtitle={subtitle} icon={icon} />
        </Card>
      </Link>
    )
  }

  return (
    <Card
      className={cn(className, onClick && hoverClass)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <StatCardInner title={title} value={value} subtitle={subtitle} icon={icon} />
    </Card>
  )
}
