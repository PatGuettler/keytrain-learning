export const SUPPORT_CATEGORIES = [
  { value: 'bug', label: 'Bug report' },
  { value: 'feature', label: 'Feature request' },
  { value: 'training_request', label: 'Request training' },
  { value: 'question', label: 'General question' },
  { value: 'other', label: 'Other' },
] as const

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]['value']

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  bug: 'Bug report',
  feature: 'Feature request',
  training_request: 'Request training',
  question: 'General question',
  other: 'Other',
}

/** Prefill when the user picks Request training (editable). */
export const TRAINING_REQUEST_SUBJECT_SUGGESTION = 'Custom training for our organization'

export const TRAINING_REQUEST_FIELDS = [
  {
    id: 'prompt',
    label: 'What prompted this request',
    placeholder:
      'What are you seeing? e.g. rising phishing alerts, weak quiz scores on a topic, or trends in RailNet Host uploads / Reporting.',
    required: true,
    rows: 3,
  },
  {
    id: 'audience',
    label: 'Who should complete the training',
    placeholder: 'All staff, a department, managers only, new hires, etc.',
    required: true,
    rows: 2,
  },
  {
    id: 'topics',
    label: 'Topics or scenarios to cover',
    placeholder: 'Specific threats, policies, workflows, or compliance areas — be as concrete as you can.',
    required: true,
    rows: 3,
  },
  {
    id: 'format',
    label: 'Preferred format (if you have one)',
    placeholder: 'Micro-lesson, full course, workshop, phishing simulation follow-up, etc.',
    required: false,
    rows: 2,
  },
  {
    id: 'timeline',
    label: 'Timeline or urgency',
    placeholder: 'When you need this live, or any upcoming audit / event.',
    required: false,
    rows: 2,
  },
  {
    id: 'context',
    label: 'RailNet / KeyTrain details (if applicable)',
    placeholder: 'Org name, reporting period, host ids, alert types, or what you saw in the portal.',
    required: false,
    rows: 2,
  },
  {
    id: 'other',
    label: 'Anything else we should know',
    placeholder: 'Optional — anything that would help us scope the training.',
    required: false,
    rows: 2,
  },
] as const

export type TrainingRequestFieldId = (typeof TRAINING_REQUEST_FIELDS)[number]['id']

export function emptyTrainingRequestFields(): Record<TrainingRequestFieldId, string> {
  return Object.fromEntries(TRAINING_REQUEST_FIELDS.map((f) => [f.id, ''])) as Record<
    TrainingRequestFieldId,
    string
  >
}

/** Combine structured fields into one support message (backend/email unchanged). */
export function buildTrainingRequestMessage(fields: Record<TrainingRequestFieldId, string>): string {
  return TRAINING_REQUEST_FIELDS.map(({ id, label }) => {
    const value = fields[id]?.trim()
    if (!value) return null
    return `${label}:\n${value}`
  })
    .filter(Boolean)
    .join('\n\n')
}

export const TRAINING_REQUEST_GUIDANCE = [
  'What you are seeing — alerts, trends, weak domains, or incidents that training should address.',
  'Audience — who needs the training and roughly how many people.',
  'Specific topics — phrases, scenarios, policies, or compliance requirements to cover.',
  'Timeline — when you need it and why (optional but helpful).',
  'RailNet context — if you use it, note org, reporting period, or what you saw under Host uploads / Reporting.',
] as const
