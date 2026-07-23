import { getSupabase } from '@/services/supabase'

function requireSupabase() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchResolvedTrainingNeedModuleIds(orgId: string): Promise<string[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('resolved_training_needs')
    .select('module_id')
    .eq('org_id', orgId)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.module_id)
}

export async function resolveTrainingNeed(orgId: string, moduleId: string, adminId: string) {
  const supabase = requireSupabase()
  const { error } = await supabase.from('resolved_training_needs').upsert(
    {
      org_id: orgId,
      module_id: moduleId,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,module_id' }
  )

  if (error) throw new Error(error.message)
}
