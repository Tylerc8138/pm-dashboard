import React, { useRef, useCallback, useEffect } from 'react'
import { useCalendarData } from '@/hooks/use-calendar-data'
import { daysBetween, dateToX } from '@/lib/date-utils'
import { getTeamColor } from '@/lib/utils'
import { TimelineHeader } from './timeline-header'
import { TimelineRow } from './timeline-row'

const HEADER_HEIGHT = 52
const ROW_HEIGHT = 72
const DAY_WIDTH = 5
const LABEL_WIDTH = 220

interface TimelineViewProps {
  teamId?: string | null
}

export function TimelineView({ teamId }: TimelineViewProps) {
  const { sprintsWithTasks, dateRange, teamMap, isLoading } = useCalendarData(teamId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    if (scrollRef.current && labelRef.current) {
      labelRef.current.scrollTop = scrollRef.current.scrollTop
    }
  }, [])

  // Auto-scroll to today on mount
  useEffect(() => {
    if (!dateRange || !scrollRef.current) return
    const todayX = dateToX(new Date(), dateRange.start, DAY_WIDTH)
    const containerWidth = scrollRef.current.clientWidth
    scrollRef.current.scrollLeft = Math.max(0, todayX - containerWidth / 3)
  }, [dateRange])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#12122a] text-[#8888aa]">
        Loading timeline...
      </div>
    )
  }

  if (!dateRange || sprintsWithTasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#12122a] text-[#8888aa]">
        <p className="text-sm">No sprints with dates to display.</p>
        <p className="text-xs opacity-60">Set start and end dates on your sprints to see them here.</p>
      </div>
    )
  }

  const totalDays = daysBetween(dateRange.start, dateRange.end)
  const totalWidth = totalDays * DAY_WIDTH
  const totalHeight = HEADER_HEIGHT + sprintsWithTasks.length * ROW_HEIGHT + 40

  const today = new Date()
  const todayX = dateToX(today, dateRange.start, DAY_WIDTH)
  const todayVisible = todayX >= 0 && todayX <= totalWidth

  return (
    <div className="flex h-full bg-[#12122a]">
      {/* Fixed sprint label column */}
      <div
        ref={labelRef}
        className="shrink-0 overflow-hidden border-r border-[#2a2a4a] bg-[#16163a]"
        style={{ width: LABEL_WIDTH }}
      >
        {/* Header spacer */}
        <div
          className="flex items-end px-4 pb-2 border-b border-[#2a2a4a]"
          style={{ height: HEADER_HEIGHT }}
        >
          <span className="text-[11px] font-medium text-[#6666888] tracking-wider uppercase">Sprints</span>
        </div>

        {/* Sprint labels */}
        {sprintsWithTasks.map(sprint => {
          // Get dominant team for color dot
          const teamCounts = new Map<string, number>()
          for (const task of sprint.tasks) {
            teamCounts.set(task.team_id, (teamCounts.get(task.team_id) ?? 0) + 1)
          }
          let dominantTeamName = ''
          let maxCount = 0
          for (const [tid, count] of teamCounts) {
            if (count > maxCount) {
              maxCount = count
              dominantTeamName = teamMap.get(tid)?.name ?? ''
            }
          }
          const color = getTeamColor(dominantTeamName)

          return (
            <div
              key={sprint.id}
              className="flex items-center gap-3 px-4 border-b border-[#2a2a4a]"
              style={{ height: ROW_HEIGHT }}
            >
              {/* Team color dot */}
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color.bar }}
              />
              <div className="flex flex-col min-w-0 gap-0.5">
                <span className="text-[13px] font-medium text-[#e0e0f0] truncate">
                  {sprint.name}
                </span>
                <span className="text-[11px] text-[#6666880]">
                  Sprint {sprint.number} &middot; {sprint.doneCount}/{sprint.totalCount} done
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable SVG area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <svg width={totalWidth} height={totalHeight} className="block">
          {/* Background */}
          <rect x={0} y={0} width={totalWidth} height={totalHeight} fill="#12122a" />

          <TimelineHeader
            startDate={dateRange.start}
            endDate={dateRange.end}
            dayWidth={DAY_WIDTH}
            totalWidth={totalWidth}
            headerHeight={HEADER_HEIGHT}
          />

          {/* Row grid lines */}
          {sprintsWithTasks.map((_, i) => (
            <line
              key={i}
              x1={0}
              y1={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
              x2={totalWidth}
              y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
              stroke="#1e1e3a"
              strokeWidth={1}
            />
          ))}

          {/* Vertical week gridlines extending through the chart */}
          {(() => {
            const lines: React.ReactElement[] = []
            const current = new Date(dateRange.start)
            const dayOfWeek = current.getDay()
            if (dayOfWeek !== 1) current.setDate(current.getDate() + ((8 - dayOfWeek) % 7))
            let idx = 0
            while (current <= dateRange.end) {
              const x = dateToX(current, dateRange.start, DAY_WIDTH)
              lines.push(
                <line key={`vl${idx++}`} x1={x} y1={HEADER_HEIGHT} x2={x} y2={totalHeight} stroke="#1a1a38" strokeWidth={0.5} />
              )
              current.setDate(current.getDate() + 7)
            }
            return lines
          })()}

          {/* Sprint bars */}
          {sprintsWithTasks.map((sprint, i) => (
            <TimelineRow
              key={sprint.id}
              sprint={sprint}
              startDate={dateRange.start}
              dayWidth={DAY_WIDTH}
              yPosition={HEADER_HEIGHT + i * ROW_HEIGHT}
              rowHeight={ROW_HEIGHT}
              teamMap={teamMap}
            />
          ))}

          {/* Today line */}
          {todayVisible && (
            <g>
              <line
                x1={todayX}
                y1={HEADER_HEIGHT}
                x2={todayX}
                y2={totalHeight}
                stroke="#ef4444"
                strokeWidth={1.5}
              />
              {/* Today dot at top */}
              <circle cx={todayX} cy={HEADER_HEIGHT} r={4} fill="#ef4444" />
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
