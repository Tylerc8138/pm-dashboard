import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCalendarData } from '@/hooks/use-calendar-data'
import { useUpdateSprint } from '@/hooks/use-sprints'
import { useUpdateTask } from '@/hooks/use-tasks'
import { useCurrentMember } from '@/hooks/use-current-member'
import { daysBetween, dateToX, xToDate, formatDateKey } from '@/lib/date-utils'
import { TimelineHeader } from './timeline-header'
import { TimelineRow } from './timeline-row'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task, TaskStatus } from '@/types/database'

const HEADER_HEIGHT = 56
const ROW_HEIGHT = 80
const DAY_WIDTH = 10
const LABEL_WIDTH = 200

interface TimelineViewProps {
  teamId?: string | null
  onEditTask?: (task: Task) => void
  onNewTask?: (status: TaskStatus, dueDate?: string) => void
}

export function TimelineView({ teamId, onEditTask, onNewTask }: TimelineViewProps) {
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const { sprintsWithTasks, dateRange, teamMap, isLoading } = useCalendarData(teamId, selectedYear)
  const scrollRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const updateSprint = useUpdateSprint()
  const updateTask = useUpdateTask()
  const { data: currentMember } = useCurrentMember()

  const handleSprintResize = useCallback((sprintId: string, field: 'start_date' | 'end_date', newDate: string) => {
    updateSprint.mutate({ id: sprintId, [field]: newDate })
  }, [updateSprint])

  const handleTaskReschedule = useCallback((taskId: string, newDueDate: string) => {
    const task = sprintsWithTasks.flatMap(s => s.tasks).find(t => t.id === taskId)
    if (task) {
      updateTask.mutate({ update: { id: taskId, due_date: newDueDate }, previousTask: task, actorId: currentMember?.id })
    }
  }, [sprintsWithTasks, updateTask, currentMember])

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
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading timeline...
      </div>
    )
  }

  if (!dateRange || sprintsWithTasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
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
    <div className="flex h-full flex-col bg-background">
      {/* Year navigation */}
      <div className="flex items-center justify-center gap-3 px-4 py-2 border-b bg-muted/20 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(y => y - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-sm font-semibold w-12 text-center">{selectedYear}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(y => y + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-7 ml-2" onClick={() => setSelectedYear(new Date().getFullYear())}>
          This Year
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
      {/* Fixed sprint label column */}
      <div
        ref={labelRef}
        className="shrink-0 overflow-hidden border-r"
        style={{ width: LABEL_WIDTH }}
      >
        {/* Header spacer */}
        <div
          className="flex items-end px-4 pb-2 border-b bg-muted/30"
          style={{ height: HEADER_HEIGHT }}
        >
          <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">Sprints</span>
        </div>

        {/* Sprint labels */}
        {sprintsWithTasks.map(sprint => (
          <div
            key={sprint.id}
            className="flex items-center px-4 border-b"
            style={{ height: ROW_HEIGHT }}
          >
            <div className="flex flex-col min-w-0 gap-0.5">
              <span className="text-sm font-semibold text-foreground truncate">
                {sprint.name}
              </span>
              <span className="text-xs text-muted-foreground">
                Sprint {sprint.number}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable SVG area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <svg
          width={totalWidth}
          height={totalHeight}
          className="block"
          onDoubleClick={(e) => {
            if (!onNewTask || !dateRange) return
            const svg = e.currentTarget
            const pt = svg.createSVGPoint()
            pt.x = e.clientX; pt.y = e.clientY
            const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse())
            const clickDate = xToDate(svgPt.x, dateRange.start, DAY_WIDTH)
            onNewTask('todo', formatDateKey(clickDate))
          }}
        >
          <TimelineHeader
            startDate={dateRange.start}
            endDate={dateRange.end}
            dayWidth={DAY_WIDTH}
            totalWidth={totalWidth}
            headerHeight={HEADER_HEIGHT}
          />

          {/* Row backgrounds */}
          {sprintsWithTasks.map((_, i) => (
            <React.Fragment key={i}>
              <rect
                x={0}
                y={HEADER_HEIGHT + i * ROW_HEIGHT}
                width={totalWidth}
                height={ROW_HEIGHT}
                fill={i % 2 === 0 ? '#ffffff' : '#f9fafb'}
              />
              <line
                x1={0}
                y1={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                x2={totalWidth}
                y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                stroke="#f0f0f0"
                strokeWidth={1}
              />
            </React.Fragment>
          ))}

          {/* Vertical week gridlines */}
          {(() => {
            const lines: React.ReactElement[] = []
            const current = new Date(dateRange.start)
            const dayOfWeek = current.getDay()
            if (dayOfWeek !== 1) current.setDate(current.getDate() + ((8 - dayOfWeek) % 7))
            let idx = 0
            while (current <= dateRange.end) {
              const x = dateToX(current, dateRange.start, DAY_WIDTH)
              lines.push(
                <line key={`vl${idx++}`} x1={x} y1={HEADER_HEIGHT} x2={x} y2={totalHeight} stroke="#f3f4f6" strokeWidth={0.5} />
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
              onTaskClick={onEditTask}
              onSprintResize={handleSprintResize}
              onTaskReschedule={handleTaskReschedule}
            />
          ))}

          {/* Today line */}
          {todayVisible && (
            <g>
              <line
                x1={todayX}
                y1={0}
                x2={todayX}
                y2={totalHeight}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              <circle cx={todayX} cy={HEADER_HEIGHT} r={4} fill="#ef4444" />
            </g>
          )}
        </svg>
      </div>
      </div>
    </div>
  )
}
