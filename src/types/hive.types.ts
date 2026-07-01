export type HiveRecord = Record<string, unknown> & {
  pk?: string
  sk?: string
  hive_org_id?: string
}

export type HiveDataResponse = {
  fetched_at: string
  region: string
  org_ids: string[]
  counts: {
    indicators: number
    host_batches: number
    legacy_iocs: number
    trend_reports: number
    training_assignments: number
    signatures: number
  }
  indicators: HiveRecord[]
  trend_reports: HiveRecord[]
  training_assignments: HiveRecord[]
  signatures: HiveRecord[]
  error?: string
}
