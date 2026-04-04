export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000
  return Math.round((b.getTime() - a.getTime()) / msPerDay)
}

export function dateToX(date: Date, startDate: Date, dayWidth: number): number {
  return daysBetween(startDate, date) * dayWidth
}

export function getMonthBoundaries(
  start: Date,
  end: Date,
  dayWidth: number
): { label: string; x: number }[] {
  const months: { label: string; x: number }[] = []
  const labels = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const current = new Date(start.getFullYear(), start.getMonth(), 1)

  while (current <= end) {
    months.push({
      label: labels[current.getMonth()],
      x: dateToX(current, start, dayWidth),
    })
    current.setMonth(current.getMonth() + 1)
  }

  return months
}

export function getWeekBoundaries(
  start: Date,
  end: Date,
  dayWidth: number
): { label: string; x: number }[] {
  const weeks: { label: string; x: number }[] = []
  // Start from the first Monday on or after start
  const current = new Date(start)
  const dayOfWeek = current.getDay()
  if (dayOfWeek !== 1) {
    current.setDate(current.getDate() + ((8 - dayOfWeek) % 7))
  }

  while (current <= end) {
    weeks.push({
      label: String(current.getDate()),
      x: dateToX(current, start, dayWidth),
    })
    current.setDate(current.getDate() + 7)
  }

  return weeks
}

export function getCalendarDays(month: Date): Date[] {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDay = new Date(year, m, 1)
  const startOffset = firstDay.getDay() // 0 = Sunday

  const days: Date[] = []
  const start = new Date(year, m, 1 - startOffset)

  // Always generate 42 days (6 rows) to keep grid consistent
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }

  return days
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

export function xToDate(x: number, startDate: Date, dayWidth: number): Date {
  const days = Math.round(x / dayWidth)
  return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + days)
}
