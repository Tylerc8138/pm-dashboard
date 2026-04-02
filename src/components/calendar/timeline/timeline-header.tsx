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
      <rect x={0} y={0} width={totalWidth} height={headerHeight} fill="#1a1a2e" />

      {/* Month labels */}
      {months.map((m, i) => {
        const nextX = i < months.length - 1 ? months[i + 1].x : totalWidth
        return (
          <g key={m.label + m.x}>
            <line x1={m.x} y1={0} x2={m.x} y2={headerHeight} stroke="#2a2a4a" strokeWidth={1} />
            <text
              x={m.x + (nextX - m.x) / 2}
              y={18}
              textAnchor="middle"
              fill="#8888aa"
              fontSize={11}
              fontWeight={600}
              letterSpacing={1}
            >
              {m.label}
            </text>
          </g>
        )
      })}

      {/* Week tick marks */}
      {weeks.map(w => (
        <g key={'w' + w.x}>
          <line x1={w.x} y1={28} x2={w.x} y2={headerHeight} stroke="#2a2a4a" strokeWidth={0.5} />
          <text
            x={w.x}
            y={42}
            textAnchor="middle"
            fill="#666680"
            fontSize={9}
          >
            {w.label}
          </text>
        </g>
      ))}

      {/* Bottom border */}
      <line x1={0} y1={headerHeight} x2={totalWidth} y2={headerHeight} stroke="#2a2a4a" strokeWidth={1} />
    </g>
  )
}
