import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCalendarData } from '@/hooks/use-calendar-data'
import { getCalendarDays, formatDateKey, addMonths } from '@/lib/date-utils'
import { CalendarDayCell } from './calendar-day-cell'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface MonthCalendarViewProps {
  teamId?: string | null
}

export function MonthCalendarView({ teamId }: MonthCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const { tasksByDate, teamMap, isLoading } = useCalendarData(teamId)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading calendar...
      </div>
    )
  }

  const calendarDays = getCalendarDays(currentMonth)
  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`

  // Count tasks this month for the header
  const monthTaskCount = calendarDays
    .filter(d => d.getMonth() === currentMonth.getMonth())
    .reduce((sum, d) => sum + (tasksByDate.get(formatDateKey(d))?.length ?? 0), 0)

  return (
    <div className="flex h-full flex-col">
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4 px-6 py-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentMonth(m => addMonths(m, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center">
          <h2 className="text-base font-semibold">{monthLabel}</h2>
          {monthTaskCount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {monthTaskCount} task{monthTaskCount !== 1 ? 's' : ''} due
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {/* Today button */}
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={() => setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
        >
          Today
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto px-6 pb-4">
        <div className="grid grid-cols-7 rounded-lg border border-border/50 overflow-hidden">
          {/* Day name headers */}
          {DAY_NAMES.map((d, i) => (
            <div
              key={d}
              className={`bg-muted/40 py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${
                i < 6 ? 'border-r border-border/50' : ''
              }`}
            >
              {d}
            </div>
          ))}

          {/* Day cells */}
          {calendarDays.map(date => {
            const key = formatDateKey(date)
            const dayTasks = tasksByDate.get(key) ?? []
            return (
              <CalendarDayCell
                key={key}
                date={date}
                tasks={dayTasks}
                isCurrentMonth={date.getMonth() === currentMonth.getMonth()}
                teamMap={teamMap}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
