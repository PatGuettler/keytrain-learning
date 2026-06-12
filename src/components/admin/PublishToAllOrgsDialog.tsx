import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function PublishToAllOrgsDialog({
  open,
  onOpenChange,
  courseTitle,
  hospitalCount,
  alreadyPublishedCount = 0,
  publishing,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseTitle: string
  hospitalCount: number
  alreadyPublishedCount?: number
  publishing?: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish to all organizations?</DialogTitle>
          <DialogDescription>
            {alreadyPublishedCount > 0 ? (
              <>
                <span className="font-medium text-foreground">{courseTitle}</span> is already live in{' '}
                {alreadyPublishedCount} hospital{alreadyPublishedCount === 1 ? '' : 's'}. This will
                publish it to the remaining {hospitalCount} so every organization has it.
              </>
            ) : (
              <>
                This will publish <span className="font-medium text-foreground">{courseTitle}</span>{' '}
                to all {hospitalCount} hospital{hospitalCount === 1 ? '' : 's'}. Every manager and
                employee in those organizations will be required to complete it.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={publishing} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={publishing} onClick={onConfirm}>
            {publishing ? 'Publishing…' : 'Publish to all'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
