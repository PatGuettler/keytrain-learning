import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRole } from '@/hooks/useRole'

export function ExportPdfButton({
  onExport,
  disabled,
  label = 'Export PDF',
  allowNonAdmin = false,
}: {
  onExport: () => void | Promise<void>
  disabled?: boolean
  label?: string
  /** When true, managers / org admins with RailNet can export too */
  allowNonAdmin?: boolean
}) {
  const { isAdmin, isOrgAdmin, isManager, isEmployee } = useRole()
  const [exporting, setExporting] = useState(false)

  const canExport =
    isAdmin || (allowNonAdmin && (isOrgAdmin || isManager || isEmployee))

  if (!canExport) return null

  const handleClick = async () => {
    if (exporting || disabled) return
    setExporting(true)
    try {
      await onExport()
    } catch (err) {
      console.error('PDF export failed', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || exporting}
      className="min-h-9"
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-1.5" />
      )}
      {exporting ? 'Exporting…' : label}
    </Button>
  )
}
