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

export function MonthCalendarView() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const { tasksByDate, isLoading } = useCalendarData()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading calendar...
      </div>
    )
  }

  const calendarDays = getCalendarDays(currentMonth)
  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`

  return (
    <div className="flex h-full flex-col">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-6 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(m => addMonths(m, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold">{monthLabel}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto px-6 pb-4">
        <div className="grid grid-cols-7 border-l border-t">
          {/* Day name headers */}
          {DAY_NAMES.map(d => (
            <div
              key={d}
              className="border-r border-b bg-muted/30 p-2 text-center text-xs font-medium text-muted-foreground"
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
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
