import type {
  ColumnDefinition,
  RailnetTableViewId,
  TableColumnPref,
  TableViewPref,
} from '@/types/table-column-prefs.types'

export function defaultColumnPrefs(definitions: ColumnDefinition[]): TableColumnPref[] {
  return definitions.map((def) => ({
    id: def.id,
    visible: def.defaultVisible,
    width: def.defaultWidth,
  }))
}

export function resolveColumnPrefs(
  definitions: ColumnDefinition[],
  saved: TableViewPref | undefined
): TableColumnPref[] {
  const defsById = new Map(definitions.map((d) => [d.id, d]))
  const defaults = defaultColumnPrefs(definitions)
  const savedList = saved?.columns ?? []
  const result: TableColumnPref[] = []
  const seen = new Set<string>()

  for (const item of savedList) {
    const def = defsById.get(item.id)
    if (!def || seen.has(item.id)) continue
    seen.add(item.id)
    result.push({
      id: item.id,
      visible: def.locked ? true : Boolean(item.visible),
      width: clampWidth(item.width, def),
    })
  }

  for (const def of definitions) {
    if (seen.has(def.id)) continue
    const fallback = defaults.find((c) => c.id === def.id)!
    result.push(fallback)
  }

  return enforceLockedColumnOrder(definitions, result)
}

export function visibleOrderedColumns(
  definitions: ColumnDefinition[],
  prefs: TableColumnPref[]
): Array<ColumnDefinition & TableColumnPref> {
  const defsById = new Map(definitions.map((d) => [d.id, d]))
  return prefs
    .filter((p) => p.visible)
    .map((p) => {
      const def = defsById.get(p.id)
      if (!def) return null
      return { ...def, ...p }
    })
    .filter(Boolean) as Array<ColumnDefinition & TableColumnPref>
}

function clampWidth(width: unknown, def: ColumnDefinition): number {
  const n = typeof width === 'number' && Number.isFinite(width) ? width : def.defaultWidth
  return Math.min(def.maxWidth, Math.max(def.minWidth, Math.round(n)))
}

function enforceLockedColumnOrder(
  definitions: ColumnDefinition[],
  prefs: TableColumnPref[]
): TableColumnPref[] {
  const lockedIds = definitions.filter((d) => d.locked).map((d) => d.id)
  if (lockedIds.length === 0) return prefs

  const withoutLocked = prefs.filter((p) => !lockedIds.includes(p.id))
  const lockedPrefs = lockedIds
    .map((id) => prefs.find((p) => p.id === id) ?? defaultColumnPrefs(definitions).find((p) => p.id === id))
    .filter(Boolean) as TableColumnPref[]

  return [...withoutLocked, ...lockedPrefs]
}

export function reorderColumnPrefs(
  definitions: ColumnDefinition[],
  prefs: TableColumnPref[],
  activeId: string,
  overId: string
): TableColumnPref[] {
  const movable = prefs.filter((p) => !definitions.find((d) => d.id === p.id)?.locked)
  const locked = prefs.filter((p) => definitions.find((d) => d.id === p.id)?.locked)
  const oldIndex = movable.findIndex((p) => p.id === activeId)
  const newIndex = movable.findIndex((p) => p.id === overId)
  if (oldIndex < 0 || newIndex < 0) return prefs

  const reordered = [...movable]
  const [removed] = reordered.splice(oldIndex, 1)
  reordered.splice(newIndex, 0, removed)
  return [...reordered, ...locked]
}

export function setColumnVisibility(
  definitions: ColumnDefinition[],
  prefs: TableColumnPref[],
  columnId: string,
  visible: boolean
): TableColumnPref[] {
  const def = definitions.find((d) => d.id === columnId)
  if (def?.locked) return prefs

  const visibleCount = prefs.filter((p) => p.visible).length
  if (!visible && visibleCount <= 1) return prefs

  return prefs.map((p) => (p.id === columnId ? { ...p, visible } : p))
}

export function setColumnWidth(
  definitions: ColumnDefinition[],
  prefs: TableColumnPref[],
  columnId: string,
  width: number
): TableColumnPref[] {
  const def = definitions.find((d) => d.id === columnId)
  if (!def) return prefs
  const nextWidth = clampWidth(width, def)
  return prefs.map((p) => (p.id === columnId ? { ...p, width: nextWidth } : p))
}

export function isRailnetTableViewId(value: string): value is RailnetTableViewId {
  return (
    value === 'host_uploads_batch' ||
    value === 'host_uploads_legacy' ||
    value === 'security_posture'
  )
}
