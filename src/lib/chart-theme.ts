/** Recharts styling that follows CSS theme variables (light/dark). */
export const chartTheme = {
  axisStroke: 'hsl(var(--muted-foreground))',
  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
  tooltip: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--card-foreground))',
  },
  legend: { color: 'hsl(var(--foreground))' },
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--muted-foreground))',
}
