import { getMonthBoundaries, getWeekBoundaries } from '@/lib/date-utils'

interface TimelineHeaderProps {
  startDate: Date
  endDate: Date
  dayWidth: number
  totalWidth: number
}

export function TimelineHeader({ startDate, endDate, dayWidth, totalWidth }: TimelineHeaderProps) {
  const months = getMonthBoundaries(startDate, endDate, dayWidth)
  const weeks = getWeekBoundaries(startDate, endDate, dayWidth)

  return (
    <g>
      {/* Month labels */}
      {months.map((m, i) => {
        const nextX = i < months.length - 1 ? months[i + 1].x : totalWidth
        return (
          <g key={m.label + m.x}>
            <line x1={m.x} y1={0} x2={m.x} y2={48} stroke="#e5e7eb" strokeWidth={1} />
            <text
              x={m.x + (nextX - m.x) / 2}
              y={16}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={11}
              fontWeight={600}
            >
              {m.label}
            </text>
          </g>
        )
      })}

      {/* Week tick marks */}
      {weeks.map(w => (
        <g key={'w' + w.x}>
          <line x1={w.x} y1={24} x2={w.x} y2={48} stroke="#e5e7eb" strokeWidth={0.5} />
          <text
            x={w.x}
            y={40}
            textAnchor="middle"
            className="fill-muted-foreground/60"
            fontSize={9}
          >
            {w.label}
          </text>
        </g>
      ))}

      {/* Bottom border of header */}
      <line x1={0} y1={48} x2={totalWidth} y2={48} stroke="#e5e7eb" strokeWidth={1} />
    </g>
  )
}
