import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GanttChart, CalendarDays } from 'lucide-react'
import { TimelineView } from './timeline/timeline-view'
import { MonthCalendarView } from './month-calendar/month-calendar-view'

export function CalendarPage() {
  const [subView, setSubView] = useState<'timeline' | 'month'>('timeline')

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-6 py-2">
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          <Button
            variant={subView === 'timeline' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSubView('timeline')}
            className="gap-1.5"
          >
            <GanttChart className="h-3.5 w-3.5" />
            Timeline
          </Button>
          <Button
            variant={subView === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSubView('month')}
            className="gap-1.5"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {subView === 'timeline' ? <TimelineView /> : <MonthCalendarView />}
      </div>
    </div>
  )
}
