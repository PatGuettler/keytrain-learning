export interface PrayerRequest {
  id: string
  message: string
  created_at: string
}

export interface PrayerRequestPrayer {
  request_id: string
  admin_id: string
  prayed_at: string
  admin?: { full_name: string }
}

export interface PrayerRequestWithPrayers extends PrayerRequest {
  prayers: PrayerRequestPrayer[]
}
