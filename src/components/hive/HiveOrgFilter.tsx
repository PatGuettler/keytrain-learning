import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type HiveOrgFilterProps = {
  orgIds: string[]
  selectedOrgIds: string[]
  onToggleOrg: (orgId: string) => void
  onClear: () => void
}

export function HiveOrgFilter({
  orgIds,
  selectedOrgIds,
  onToggleOrg,
  onClear,
}: HiveOrgFilterProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filter by org</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {orgIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No RailNet orgs found in AWS yet. KT hosts push data under partition keys like{' '}
            <code className="text-xs">ORG#church001</code>.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {orgIds.map((orgId) => {
              const active = selectedOrgIds.includes(orgId)
              return (
                <Button
                  key={orgId}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => onToggleOrg(orgId)}
                >
                  {orgId}
                </Button>
              )
            })}
            {selectedOrgIds.length > 0 && (
              <Button type="button" size="sm" variant="ghost" onClick={onClear}>
                Clear filter
              </Button>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          All platform admins see all AWS orgs. Select one or more to narrow dashboards below.
        </p>
      </CardContent>
    </Card>
  )
}
