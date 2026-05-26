import type { SVGProps } from 'react'

/** Detailed ward floor plan used as the default node-map background */
export function HospitalFloorPlan(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 800 520"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Hospital ward floor plan"
      {...props}
    >
      <defs>
        <pattern id="floorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.5" />
        </pattern>
        <linearGradient id="corridorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--muted))" />
          <stop offset="100%" stopColor="hsl(var(--card))" />
        </linearGradient>
      </defs>

      {/* Building shell */}
      <rect width="800" height="520" fill="hsl(var(--background))" />
      <rect x="24" y="24" width="752" height="472" rx="12" fill="url(#floorGrid)" stroke="hsl(var(--border))" strokeWidth="2" />

      {/* North wing label */}
      <text x="400" y="48" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="13" fontWeight="600" letterSpacing="0.08em">
        MEDICAL SURGICAL WARD — 2ND FLOOR
      </text>

      {/* Main corridor */}
      <rect x="180" y="200" width="440" height="72" rx="6" fill="url(#corridorGrad)" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <text x="400" y="244" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="500">
        MAIN CORRIDOR
      </text>

      {/* Nurses station (center hub) */}
      <rect x="320" y="155" width="160" height="100" rx="8" fill="hsl(var(--primary) / 0.12)" stroke="hsl(var(--primary))" strokeWidth="2" />
      <rect x="360" y="185" width="80" height="40" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--primary) / 0.5)" strokeWidth="1" />
      <text x="400" y="212" textAnchor="middle" fill="hsl(var(--primary))" fontSize="12" fontWeight="700">
        NURSES
      </text>
      <text x="400" y="228" textAnchor="middle" fill="hsl(var(--primary))" fontSize="12" fontWeight="700">
        STATION
      </text>

      {/* Patient rooms — north row */}
      <g>
        <Room x={60} y={70} w={100} h={110} label="201" />
        <Room x={180} y={70} w={100} h={110} label="202" />
        <Room x={520} y={70} w={100} h={110} label="203" />
        <Room x={640} y={70} w={100} h={110} label="204" highlight />
      </g>

      {/* South wing rooms */}
      <Room x={60} y={310} w={100} h={100} label="Pharmacy" subLabel="MEDS" />
      <Room x={640} y={310} w={100} h={100} label="Supply" subLabel="CLSET" />

      {/* Waiting / reception */}
      <rect x={60} y={430} width="200" height="55" rx="8" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <text x="160" y="455" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="600">
        WAITING / RECEPTION
      </text>
      <text x="160" y="472" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">
        Public access
      </text>

      {/* Elevators */}
      <rect x="280" y="430" width="70" height="55" rx="6" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <text x="315" y="462" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="600">
        ELEVATOR
      </text>

      {/* Staff lounge */}
      <rect x={380} y={430} width="120" height="55" rx="8" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <text x="440" y="462" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="600">
        STAFF LOUNGE
      </text>

      {/* IT / records */}
      <rect x={530} y={430} width="110" height="55" rx="8" fill="hsl(var(--accent))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <text x="585" y="455" textAnchor="middle" fill="hsl(var(--accent-foreground))" fontSize="10" fontWeight="600">
        IT / EHR
      </text>
      <text x="585" y="472" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9">
        Server room
      </text>

      {/* Restrooms */}
      <rect x={660} y={430} width="80" height="55" rx="6" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="700" y="462" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">
        RESTROOM
      </text>

      {/* Door symbols on corridor */}
      <path d="M140 236 L140 220 M140 236 L155 236" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />
      <path d="M660 236 L660 220 M660 236 L645 236" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />

      {/* Legend box */}
      <rect x="28" y="28" width="168" height="52" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.95" />
      <circle cx="48" cy="48" r="6" fill="#f59e0b" />
      <text x="62" y="52" fill="hsl(var(--foreground))" fontSize="10">
        Tap alerts to investigate
      </text>
      <circle cx="48" cy="68" r="6" fill="hsl(var(--primary))" />
      <text x="62" y="72" fill="hsl(var(--muted-foreground))" fontSize="10">
        Staff-only zones
      </text>
    </svg>
  )
}

function Room({
  x,
  y,
  w,
  h,
  label,
  subLabel,
  highlight,
}: {
  x: number
  y: number
  w: number
  h: number
  label: string
  subLabel?: string
  highlight?: boolean
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={highlight ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--card))'}
        stroke={highlight ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
        strokeWidth={highlight ? 2 : 1.5}
      />
      {/* Bed symbol */}
      <rect x={x + 12} y={y + h - 28} width={w - 24} height={16} rx={3} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
      <circle cx={x + 22} cy={y + h - 20} r={5} fill="hsl(var(--muted-foreground) / 0.3)" />
      <text
        x={x + w / 2}
        y={y + (subLabel ? 28 : 32)}
        textAnchor="middle"
        fill={highlight ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'}
        fontSize={label.length > 4 ? 10 : 14}
        fontWeight="700"
      >
        {label}
      </text>
      {subLabel && (
        <text x={x + w / 2} y={y + 44} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9" fontWeight="600">
          {subLabel}
        </text>
      )}
    </g>
  )
}
