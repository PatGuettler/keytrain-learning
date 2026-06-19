import { backend } from '@/backend'

export async function fetchPrayerRequests() {
  return backend.spiritual.fetchPrayerRequests()
}

export async function markPrayerRequestPrayed(requestId: string, adminId: string) {
  return backend.spiritual.markPrayerRequestPrayed(requestId, adminId)
}

export async function deletePrayerRequest(requestId: string) {
  return backend.spiritual.deletePrayerRequest(requestId)
}
