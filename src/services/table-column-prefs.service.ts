import { updateProfile } from '@/services/users.service'
import { useAuthStore } from '@/store/authStore'
import type {
  RailnetTablePrefs,
  RailnetTableViewId,
  TableColumnPref,
} from '@/types/table-column-prefs.types'

export async function saveRailnetTableColumnPrefs(
  userId: string,
  viewId: RailnetTableViewId,
  columns: TableColumnPref[]
) {
  const profile = useAuthStore.getState().profile
  const email = useAuthStore.getState().email
  if (!profile || !email) throw new Error('You must be signed in.')

  const current: RailnetTablePrefs = profile.railnet_table_prefs ?? {}
  const nextPrefs: RailnetTablePrefs = {
    ...current,
    [viewId]: { columns },
  }

  const updated = await updateProfile(userId, { railnet_table_prefs: nextPrefs })
  useAuthStore.getState().setAuth({ userId, email, profile: updated })
  return updated
}
