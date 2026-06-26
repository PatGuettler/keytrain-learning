export const TRAINING_CATEGORIES = [
  'healthcare',
  'general',
  'finance',
  'manufacturing',
  'retail',
  'technology',
  'government',
  'education',
  'other',
] as const

export type TrainingCategory = (typeof TRAINING_CATEGORIES)[number]

export const TRAINING_CATEGORY_LABELS: Record<TrainingCategory, string> = {
  healthcare: 'Healthcare',
  general: 'General',
  finance: 'Finance & banking',
  manufacturing: 'Manufacturing',
  retail: 'Retail',
  technology: 'Technology',
  government: 'Government',
  education: 'Education',
  other: 'Other',
}
