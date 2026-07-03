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

export const TRAINING_REQUEST_MESSAGE_TEMPLATE = `What prompted this request:
(Describe what you are seeing — e.g. rising phishing alerts in KeyTrain, weak quiz scores on a topic, or trends in RailNet Host uploads / Reporting.)

Who should complete the training:
(All staff, a department, managers only, new hires, etc.)

Topics or scenarios to cover:
(Specific threats, policies, workflows, or compliance areas — be as concrete as you can.)

Preferred format (if you have one):
(Micro-lesson, full course, workshop, phishing simulation follow-up, etc.)

Timeline or urgency:
(When you need this live, or any upcoming audit / event.)

RailNet / KeyTrain details (if applicable):
(Org name, reporting period, host ids, alert types, or link to what you saw in the portal.)

Anything else we should know:
`

export const TRAINING_REQUEST_GUIDANCE = [
  'What you are seeing — alerts, trends, weak domains, or incidents that training should address.',
  'Audience — who needs the training and roughly how many people.',
  'Specific topics — phrases, scenarios, policies, or compliance requirements to cover.',
  'Timeline — when you need it and why (optional but helpful).',
  'RailNet context — if you use it, note org, reporting period, or what you saw under Host uploads / Reporting.',
] as const
