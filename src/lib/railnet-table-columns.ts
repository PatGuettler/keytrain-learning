import type { ColumnDefinition, RailnetTableViewId } from '@/types/table-column-prefs.types'

export const HOST_UPLOADS_BATCH_COLUMNS: ColumnDefinition[] = [
  { id: 'org', label: 'Org', defaultVisible: true, defaultWidth: 120, minWidth: 80, maxWidth: 220 },
  { id: 'host', label: 'Host', defaultVisible: true, defaultWidth: 180, minWidth: 100, maxWidth: 320 },
  { id: 'period', label: 'Period', defaultVisible: true, defaultWidth: 100, minWidth: 80, maxWidth: 140 },
  { id: 'uploaded', label: 'Uploaded', defaultVisible: true, defaultWidth: 150, minWidth: 100, maxWidth: 220 },
  { id: 'alerts', label: 'Alerts', defaultVisible: true, defaultWidth: 160, minWidth: 90, maxWidth: 280 },
  { id: 'sort_key', label: 'Sort key', defaultVisible: true, defaultWidth: 200, minWidth: 120, maxWidth: 400 },
]

export const HOST_UPLOADS_LEGACY_COLUMNS: ColumnDefinition[] = [
  { id: 'org', label: 'Org', defaultVisible: true, defaultWidth: 120, minWidth: 80, maxWidth: 220 },
  { id: 'summary', label: 'Summary', defaultVisible: true, defaultWidth: 200, minWidth: 120, maxWidth: 360 },
  { id: 'host', label: 'Host', defaultVisible: true, defaultWidth: 160, minWidth: 100, maxWidth: 280 },
  { id: 'indicator', label: 'Indicator', defaultVisible: true, defaultWidth: 140, minWidth: 90, maxWidth: 260 },
  { id: 'severity', label: 'Severity', defaultVisible: true, defaultWidth: 100, minWidth: 80, maxWidth: 140 },
  { id: 'sort_key', label: 'Sort key', defaultVisible: true, defaultWidth: 200, minWidth: 120, maxWidth: 400 },
]

export const SECURITY_POSTURE_COLUMNS: ColumnDefinition[] = [
  { id: 'org', label: 'Org', defaultVisible: true, defaultWidth: 120, minWidth: 80, maxWidth: 200 },
  { id: 'rule_id', label: 'Rule id', defaultVisible: true, defaultWidth: 120, minWidth: 90, maxWidth: 200 },
  { id: 'phrase', label: 'Phrase / rule', defaultVisible: true, defaultWidth: 200, minWidth: 120, maxWidth: 360 },
  { id: 'domain', label: 'Domain', defaultVisible: true, defaultWidth: 120, minWidth: 80, maxWidth: 200 },
  { id: 'type', label: 'Type', defaultVisible: true, defaultWidth: 100, minWidth: 80, maxWidth: 160 },
  { id: 'status', label: 'Status', defaultVisible: true, defaultWidth: 100, minWidth: 80, maxWidth: 140 },
  { id: 'approved_by', label: 'Approved by', defaultVisible: true, defaultWidth: 140, minWidth: 100, maxWidth: 220 },
  { id: 'approved_at', label: 'Approved at', defaultVisible: true, defaultWidth: 140, minWidth: 100, maxWidth: 200 },
  { id: 'severity', label: 'Severity', defaultVisible: true, defaultWidth: 90, minWidth: 70, maxWidth: 120 },
  { id: 'sort_key', label: 'Sort key', defaultVisible: false, defaultWidth: 160, minWidth: 100, maxWidth: 320 },
  {
    id: 'actions',
    label: 'Actions',
    defaultVisible: true,
    defaultWidth: 160,
    minWidth: 120,
    maxWidth: 220,
    locked: true,
  },
]

export function columnDefinitionsForView(viewId: RailnetTableViewId): ColumnDefinition[] {
  switch (viewId) {
    case 'host_uploads_batch':
      return HOST_UPLOADS_BATCH_COLUMNS
    case 'host_uploads_legacy':
      return HOST_UPLOADS_LEGACY_COLUMNS
    case 'security_posture':
      return SECURITY_POSTURE_COLUMNS
  }
}
