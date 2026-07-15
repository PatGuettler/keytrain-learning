import { formatBillDelta, type OrgBillSnapshot } from '@/lib/org-billing'
import { PLAN_LABELS, formatUsdFromCents, PAYMENT_STRUCTURE_COPY } from '@/lib/seat-pricing'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function BillingImpactConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  current,
  next,
  deltaCents,
  confirmLabel = 'Confirm and apply',
  loading,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  current: OrgBillSnapshot
  next: OrgBillSnapshot
  deltaCents: number
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-muted-foreground">
            {PAYMENT_STRUCTURE_COPY.estimatedBanner}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <BillColumn heading="Current monthly" bill={current} />
            <BillColumn heading="New monthly" bill={next} />
          </div>

          <p className="font-medium">
            Your monthly total will {formatBillDelta(deltaCents)}.
          </p>
          <p className="text-xs text-muted-foreground">{PAYMENT_STRUCTURE_COPY.proration}</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={loading} onClick={onConfirm}>
            {loading ? 'Applying…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BillColumn({ heading, bill }: { heading: string; bill: OrgBillSnapshot }) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <p className="font-medium">{heading}</p>
      <p className="text-xs text-muted-foreground">{PLAN_LABELS[bill.plan]}</p>
      <ul className="space-y-1 text-xs">
        {bill.lineItems.map((line) => (
          <li key={line.key} className="flex justify-between gap-2">
            <span>
              {line.label}
              {line.key !== 'plan_base' && line.key !== 'users_included'
                ? ` × ${line.quantity}`
                : ''}
            </span>
            <span>
              {line.subtotalCents === 0 && line.key !== 'plan_base'
                ? 'Included'
                : formatUsdFromCents(line.subtotalCents)}
            </span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between border-t pt-2 font-medium">
        <span>Total</span>
        <span>{formatUsdFromCents(bill.monthlyTotalCents)}</span>
      </p>
    </div>
  )
}
