import type { SVGProps } from 'react'

/** Top-down server room / data center layout for node-map workshops */
export function ServerRoomFloorPlan(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 800 520"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Server room floor plan"
      {...props}
    >
      <defs>
        <pattern id="serverGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.5" />
        </pattern>
      </defs>

      <rect width="800" height="520" fill="hsl(var(--background))" />
      <rect x="24" y="24" width="752" height="472" rx="12" fill="url(#serverGrid)" stroke="hsl(var(--border))" strokeWidth="2" />

      <text x="400" y="48" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="13" fontWeight="600" letterSpacing="0.08em">
        DATA CENTER — SERVER ROOM A
      </text>

      {/* Entry / mantrap */}
      <rect x="340" y="420" width="120" height="56" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <text x="400" y="452" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="600">
        ENTRY / MANTRAP
      </text>

      {/* Server racks row 1 */}
      {[120, 220, 320, 420, 520, 620].map((x) => (
        <g key={`rack-a-${x}`}>
          <rect x={x} y="80" width="56" height="120" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={x + 8}
              y={90 + i * 22}
              width={40}
              height={14}
              rx="2"
              fill="hsl(var(--primary) / 0.15)"
              stroke="hsl(var(--primary) / 0.4)"
              strokeWidth="0.5"
            />
          ))}
        </g>
      ))}

      {/* Server racks row 2 */}
      {[120, 220, 320, 420, 520, 620].map((x) => (
        <g key={`rack-b-${x}`}>
          <rect x={x} y="230" width="56" height="120" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={x + 8}
              y={240 + i * 22}
              width={40}
              height={14}
              rx="2"
              fill="hsl(var(--primary) / 0.15)"
              stroke="hsl(var(--primary) / 0.4)"
              strokeWidth="0.5"
            />
          ))}
        </g>
      ))}

      {/* Network / patch panel wall */}
      <rect x="48" y="80" width="48" height="270" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <text x="72" y="220" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9" fontWeight="600" transform="rotate(-90 72 220)">
        NETWORK
      </text>

      {/* UPS / power */}
      <rect x="704" y="80" width="56" height="100" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <text x="732" y="135" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="600">
        UPS
      </text>

      {/* CRAC / cooling */}
      <rect x="704" y="200" width="56" height="80" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <text x="732" y="245" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="600">
        CRAC
      </text>

      {/* Workbench */}
      <rect x="704" y="300" width="56" height="50" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <text x="732" y="330" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9" fontWeight="600">
        BENCH
      </text>

      {/* Hot aisle marker */}
      <rect x="100" y="368" width="600" height="28" rx="4" fill="hsl(var(--destructive) / 0.08)" stroke="hsl(var(--destructive) / 0.3)" strokeWidth="1" strokeDasharray="4 2" />
      <text x="400" y="387" textAnchor="middle" fill="hsl(var(--destructive))" fontSize="10" fontWeight="600" opacity="0.8">
        HOT AISLE — AUTHORIZED PERSONNEL ONLY
      </text>
    </svg>
  )
}
