import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { columnDefinitionsForView } from '@/lib/railnet-table-columns'
import {
  defaultColumnPrefs,
  reorderColumnPrefs,
  resolveColumnPrefs,
  setColumnVisibility,
  setColumnWidth,
  visibleOrderedColumns,
} from '@/lib/table-column-prefs'
import { saveRailnetTableColumnPrefs } from '@/services/table-column-prefs.service'
import { useAuthStore } from '@/store/authStore'
import type { ColumnDefinition, RailnetTableViewId, TableColumnPref } from '@/types/table-column-prefs.types'

export function useRailnetTableColumns(viewId: RailnetTableViewId) {
  const userId = useAuthStore((s) => s.userId)
  const savedView = useAuthStore((s) => s.profile?.railnet_table_prefs?.[viewId])

  const definitions = useMemo(() => columnDefinitionsForView(viewId), [viewId])
  const [columnPrefs, setColumnPrefsState] = useState<TableColumnPref[]>(() =>
    resolveColumnPrefs(definitions, savedView)
  )
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPrefs = useRef<TableColumnPref[] | null>(null)

  useEffect(() => {
    setColumnPrefsState(resolveColumnPrefs(definitions, savedView))
  }, [definitions, savedView])

  const flushSave = useCallback(
    async (prefs: TableColumnPref[]) => {
      if (!userId) return
      setIsSaving(true)
      setSaveError('')
      try {
        await saveRailnetTableColumnPrefs(userId, viewId, prefs)
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Could not save column preferences.')
      } finally {
        setIsSaving(false)
        pendingPrefs.current = null
      }
    },
    [userId, viewId]
  )

  const scheduleSave = useCallback(
    (prefs: TableColumnPref[]) => {
      if (!userId) return
      pendingPrefs.current = prefs
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        if (pendingPrefs.current) void flushSave(pendingPrefs.current)
      }, 600)
    },
    [flushSave, userId]
  )

  const applyPrefs = useCallback(
    (prefs: TableColumnPref[]) => {
      setColumnPrefsState(prefs)
      scheduleSave(prefs)
    },
    [scheduleSave]
  )

  const visibleColumns = useMemo(
    () => visibleOrderedColumns(definitions, columnPrefs),
    [definitions, columnPrefs]
  )

  const reorderColumns = useCallback(
    (activeId: string, overId: string) => {
      applyPrefs(reorderColumnPrefs(definitions, columnPrefs, activeId, overId))
    },
    [applyPrefs, columnPrefs, definitions]
  )

  const toggleColumn = useCallback(
    (columnId: string, visible: boolean) => {
      applyPrefs(setColumnVisibility(definitions, columnPrefs, columnId, visible))
    },
    [applyPrefs, columnPrefs, definitions]
  )

  const resizeColumn = useCallback(
    (columnId: string, width: number) => {
      applyPrefs(setColumnWidth(definitions, columnPrefs, columnId, width))
    },
    [applyPrefs, columnPrefs, definitions]
  )

  const resetColumns = useCallback(() => {
    applyPrefs(defaultColumnPrefs(definitions))
  }, [applyPrefs, definitions])

  return {
    definitions,
    columnPrefs,
    visibleColumns,
    reorderColumns,
    toggleColumn,
    resizeColumn,
    resetColumns,
    saveError,
    isSaving,
  }
}

export type VisibleRailnetColumn = ColumnDefinition & TableColumnPref
