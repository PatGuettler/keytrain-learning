import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useRailnetTableColumns, type VisibleRailnetColumn } from '@/hooks/useRailnetTableColumns'
import {
  RailnetColumnSettingsDialog,
  RailnetColumnsButton,
} from '@/components/railnet/RailnetColumnSettingsDialog'
import type { RailnetTableViewId } from '@/types/table-column-prefs.types'

type ConfigurableRailNetTableProps<T> = {
  viewId: RailnetTableViewId
  rows: T[]
  rowKey: (row: T, index: number) => string
  renderCell: (columnId: string, row: T, index: number) => ReactNode
  emptyMessage: string
  showColumnControls?: boolean
  /** Filter visible columns (e.g. hide actions when user cannot manage signatures) */
  columnFilter?: (column: VisibleRailnetColumn) => boolean
}

function ResizableHeader({
  column,
  onResize,
}: {
  column: VisibleRailnetColumn
  onResize: (columnId: string, width: number) => void
}) {
  const startX = useRef(0)
  const startWidth = useRef(column.width)

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      startX.current = event.clientX
      startWidth.current = column.width

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX.current
        onResize(column.id, startWidth.current + delta)
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [column.id, column.width, onResize]
  )

  return (
    <th
      className="railnet-table-header-cell relative border-r border-border px-3 py-2 font-medium last:border-r-0"
      style={{ width: column.width, minWidth: column.minWidth, maxWidth: column.maxWidth }}
    >
      <span className="block truncate pr-3">{column.label}</span>
      <button
        type="button"
        aria-label={`Resize ${column.label} column`}
        className="railnet-col-resize-handle absolute right-0 top-0 h-full w-2 cursor-col-resize border-0 bg-border/70 hover:bg-primary/50"
        onMouseDown={onMouseDown}
      />
    </th>
  )
}

export function ConfigurableRailNetTable<T>({
  viewId,
  rows,
  rowKey,
  renderCell,
  emptyMessage,
  showColumnControls = true,
  columnFilter,
}: ConfigurableRailNetTableProps<T>) {
  const {
    definitions,
    columnPrefs,
    visibleColumns,
    reorderColumns,
    toggleColumn,
    resizeColumn,
    resetColumns,
    saveError,
    isSaving,
  } = useRailnetTableColumns(viewId)

  const displayColumns = columnFilter ? visibleColumns.filter(columnFilter) : visibleColumns
  const [dialogOpen, setDialogOpen] = useState(false)

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
  }

  return (
    <div className="space-y-2">
      {showColumnControls && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {saveError && (
            <p className="text-xs text-destructive" role="alert">
              {saveError}
            </p>
          )}
          {isSaving && !saveError && (
            <span className="text-xs text-muted-foreground">Saving columns…</span>
          )}
          <RailnetColumnsButton onClick={() => setDialogOpen(true)} />
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="railnet-configurable-table w-full table-fixed border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              {displayColumns.map((column) => (
                <ResizableHeader key={column.id} column={column} onResize={resizeColumn} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={rowKey(row, index)} className="border-t border-border">
                {displayColumns.map((column, columnIndex) => (
                  <td
                    key={column.id}
                    className={`border-border px-3 py-2 align-top overflow-hidden ${
                      columnIndex < displayColumns.length - 1 ? 'border-r' : ''
                    }`}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                    }}
                  >
                    {renderCell(column.id, row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RailnetColumnSettingsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        definitions={definitions}
        columnPrefs={columnPrefs}
        onReorder={reorderColumns}
        onToggle={toggleColumn}
        onReset={resetColumns}
        isSaving={isSaving}
      />
    </div>
  )
}