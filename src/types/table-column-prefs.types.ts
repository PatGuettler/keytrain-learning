export type RailnetTableViewId =
  | 'host_uploads_batch'
  | 'host_uploads_legacy'
  | 'security_posture'

export type TableColumnPref = {
  id: string
  visible: boolean
  width: number
}

export type TableViewPref = {
  columns: TableColumnPref[]
}

export type RailnetTablePrefs = Partial<Record<RailnetTableViewId, TableViewPref>>

export type ColumnDefinition = {
  id: string
  label: string
  defaultVisible: boolean
  defaultWidth: number
  minWidth: number
  maxWidth: number
  /** Cannot be hidden or reordered away from last position */
  locked?: boolean
}
