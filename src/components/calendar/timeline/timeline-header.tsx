import { getMonthBoundaries, getWeekBoundaries } from '@/lib/date-utils'

interface TimelineHeaderProps {
  startDate: Date
  endDate: Date
  dayWidth: number
  totalWidth: number
  headerHeight: number
}

export function TimelineHeader({ startDate, endDate, dayWidth, totalWidth, headerHeight }: TimelineHeaderProps) {
  const months = getMonthBoundaries(startDate, endDate, dayWidth)
  const weeks = getWeekBoundaries(startDate, endDate, dayWidth)

  return (
    <g>
      {/* Header background */}
      <rect x={0} y={0} width={totalWidth} height={headerHeight} fill="#f9fafb" />

      {/* Month labels */}
      {months.map((m, i) => {
        const nextX = i < months.length - 1 ? months[i + 1].x : totalWidth
        return (
          <g key={m.label + m.x}>
            <line x1={m.x} y1={0} x2={m.x} y2={headerHeight} stroke="#e5e7eb" strokeWidth={1} />
            <text
              x={m.x + (nextX - m.x) / 2}
              y={20}
              textAnchor="middle"
              fill="#6b7280"
              fontSize={12}
              fontWeight={600}
              letterSpacing={0.5}
            >
              {m.label}
            </text>
          </g>
        )
      })}

      {/* Week tick marks */}
      {weeks.map(w => (
        <g key={'w' + w.x}>
          <line x1={w.x} y1={32} x2={w.x} y2={headerHeight} stroke="#e5e7eb" strokeWidth={0.5} />
          <text
            x={w.x}
            y={46}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize={10}
          >
            {w.label}
          </text>
        </g>
      ))}

      {/* Bottom border */}
      <line x1={0} y1={headerHeight} x2={totalWidth} y2={headerHeight} stroke="#e5e7eb" strokeWidth={1} />
    </g>
  )
}
