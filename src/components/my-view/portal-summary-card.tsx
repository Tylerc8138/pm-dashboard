import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface PortalSummaryCardProps {
  label: string
  count: number
  total?: number
  icon: LucideIcon
  color?: 'default' | 'green' | 'amber' | 'red' | 'purple' | 'blue'
}

const COLOR_MAP = {
  default: 'bg-muted text-muted-foreground',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  blue: 'bg-blue-100 text-blue-700',
}

export function PortalSummaryCard({ label, count, total, icon: Icon, color = 'default' }: PortalSummaryCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${COLOR_MAP[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">
            {count}
            {total != null && <span className="text-sm font-normal text-muted-foreground">/{total}</span>}
          </p>
        </div>
        {total != null && total > 0 && (
          <div className="ml-auto h-2 w-20 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (count / total) * 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
