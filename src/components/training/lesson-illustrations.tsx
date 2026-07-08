import type { FC, SVGProps } from 'react'

/** Inline SVG illustrations for lesson slides (no external assets required) */

export type LessonIllustrationKey =
  | 'clinical_incident'
  | 'stop_report'
  | 'reporting'
  | 'cybersecurity'
  | 'team_safety'

export const LESSON_ILLUSTRATION_KEYS: { value: LessonIllustrationKey; label: string }[] = [
  { value: 'clinical_incident', label: 'Safety incident' },
  { value: 'stop_report', label: 'Stop & report' },
  { value: 'reporting', label: 'Reporting / checklist' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'team_safety', label: 'Team safety' },
]

type IllustrationProps = SVGProps<SVGSVGElement>

export function ClinicalIncidentIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <rect width="320" height="240" rx="12" fill="hsl(var(--muted))" />
      <rect x="40" y="50" width="240" height="140" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <circle cx="160" cy="100" r="28" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="2" />
      <path d="M160 88v24M148 100h24" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
      <rect x="70" y="135" width="60" height="8" rx="4" fill="hsl(var(--muted-foreground) / 0.3)" />
      <rect x="70" y="150" width="100" height="8" rx="4" fill="hsl(var(--muted-foreground) / 0.2)" />
      <rect x="190" y="135" width="60" height="40" rx="6" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <path d="M205 155h30M205 165h20" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      <circle cx="260" cy="70" r="16" fill="#f59e0b" opacity="0.9" />
      <text x="260" y="75" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
        !
      </text>
    </svg>
  )
}

export function StopReportIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <rect width="320" height="240" rx="12" fill="hsl(var(--muted))" />
      <polygon points="160,30 290,200 30,200" fill="#dc2626" opacity="0.9" />
      <polygon points="160,55 265,185 55,185" fill="#ef4444" />
      <text x="160" y="145" textAnchor="middle" fill="white" fontSize="42" fontWeight="bold">
        !
      </text>
      <rect x="90" y="205" width="140" height="24" rx="6" fill="hsl(var(--primary))" />
      <text x="160" y="221" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
        STOP &amp; REPORT
      </text>
    </svg>
  )
}

export function ReportingIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <rect width="320" height="240" rx="12" fill="hsl(var(--muted))" />
      <rect x="80" y="40" width="160" height="160" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <rect x="100" y="60" width="120" height="12" rx="4" fill="hsl(var(--primary) / 0.4)" />
      <rect x="100" y="82" width="90" height="8" rx="3" fill="hsl(var(--muted-foreground) / 0.25)" />
      <rect x="100" y="98" width="110" height="8" rx="3" fill="hsl(var(--muted-foreground) / 0.25)" />
      <rect x="100" y="114" width="70" height="8" rx="3" fill="hsl(var(--muted-foreground) / 0.25)" />
      <circle cx="200" cy="150" r="22" fill="hsl(var(--primary))" />
      <path d="M192 150l6 6 12-14" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M130 175h60" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function CybersecurityIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <rect width="320" height="240" rx="12" fill="hsl(var(--muted))" />
      <rect x="70" y="45" width="180" height="120" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <rect x="90" y="65" width="140" height="70" rx="4" fill="hsl(var(--muted-foreground) / 0.08)" />
      <path d="M160 85l-20 12v20l20 12 20-12v-20z" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
      <circle cx="160" cy="105" r="8" fill="hsl(var(--primary))" />
      <rect x="110" y="180" width="100" height="28" rx="6" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <text x="160" y="199" textAnchor="middle" fill="hsl(var(--primary))" fontSize="10" fontWeight="600">
        PROTECT DATA
      </text>
    </svg>
  )
}

export function TeamSafetyIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <rect width="320" height="240" rx="12" fill="hsl(var(--muted))" />
      <circle cx="100" cy="120" r="32" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />
      <circle cx="160" cy="100" r="36" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2" />
      <circle cx="220" cy="120" r="32" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />
      <path d="M88 130v20M100 120h0M172 90v20M160 110h0M208 130v20M220 120h0" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      <path d="M115 145h90" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <rect x="120" y="175" width="80" height="24" rx="6" fill="hsl(var(--primary))" />
      <text x="160" y="191" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
        TEAM SAFETY
      </text>
    </svg>
  )
}

const ILLUSTRATION_MAP: Record<LessonIllustrationKey, FC<IllustrationProps>> = {
  clinical_incident: ClinicalIncidentIllustration,
  stop_report: StopReportIllustration,
  reporting: ReportingIllustration,
  cybersecurity: CybersecurityIllustration,
  team_safety: TeamSafetyIllustration,
}

export function resolveIllustrationKey(key?: string): LessonIllustrationKey | null {
  if (key && key in ILLUSTRATION_MAP) return key as LessonIllustrationKey
  return null
}

export function LessonIllustration({
  illustrationKey,
  alt,
  className,
}: {
  illustrationKey: LessonIllustrationKey
  alt: string
  className?: string
}) {
  const Component = ILLUSTRATION_MAP[illustrationKey]
  return (
    <figure className={className}>
      <Component className="w-full h-auto max-h-56 rounded-lg" />
      <figcaption className="sr-only">{alt}</figcaption>
    </figure>
  )
}
