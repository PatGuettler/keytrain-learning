export type RailNetRecord = Record<string, unknown> & {
  pk?: string
  sk?: string
  railnet_org_id?: string
}

export type RailNetDataResponse = {
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
  indicators: RailNetRecord[]
  trend_reports: RailNetRecord[]
  training_assignments: RailNetRecord[]
  signatures: RailNetRecord[]
  error?: string
}
