import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAllReferences } from '@/hooks/use-all-references'
import { useFilters } from '@/contexts/filter-context'
import { useTasks } from '@/hooks/use-tasks'
import { ExternalLink, FileText, LinkIcon } from 'lucide-react'
import type { Task } from '@/types/database'
import type { EnrichedReference } from '@/hooks/use-all-references'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.length > 30
      ? parsed.pathname.slice(0, 30) + '...'
      : parsed.pathname
    return parsed.hostname + path
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '...' : url
  }
}

interface LinksViewProps {
  onEditTask: (task: Task) => void
}

export function LinksView({ onEditTask }: LinksViewProps) {
  const { sprintId } = useFilters()
  const { data: references = [], isLoading } = useAllReferences(sprintId)
  const { data: tasks = [] } = useTasks({ sprintId })

  const grouped = useMemo(() => {
    const map: Record<string, { teamName: string; refs: EnrichedReference[] }> = {}

    for (const ref of references) {
      if (!map[ref.team_id]) {
        map[ref.team_id] = { teamName: ref.team_name, refs: [] }
      }
      map[ref.team_id].refs.push(ref)
    }

    return Object.entries(map)
      .sort(([, a], [, b]) => a.teamName.localeCompare(b.teamName))
  }, [references])

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task) onEditTask(task)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading links...
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <LinkIcon className="h-6 w-6" />
              Links Repository
            </h2>
            <p className="text-sm text-muted-foreground">
              All reference materials across the project, organized by team
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {references.length} {references.length === 1 ? 'link' : 'links'} total
          </Badge>
        </div>

        {grouped.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No reference links yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add links to tasks from the Board view by clicking a task and using the References section.
              </p>
            </CardContent>
          </Card>
        )}

        {grouped.map(([teamId, { teamName, refs }]) => (
          <Card key={teamId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {teamName}
                  <Badge variant="secondary" className="text-xs">{refs.length}</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs font-medium text-muted-foreground">
                      <th className="pb-2 pr-4 text-left">Document Name</th>
                      <th className="pb-2 pr-4 text-left">Link</th>
                      <th className="pb-2 pr-4 text-left">Date Added</th>
                      <th className="pb-2 pr-4 text-left">Task</th>
                      <th className="pb-2 text-left">Added By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refs.map((ref) => (
                      <tr key={ref.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 pr-4 font-medium">{ref.label}</td>
                        <td className="py-2.5 pr-4">
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{truncateUrl(ref.url)}</span>
                          </a>
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(ref.created_at)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <button
                            onClick={() => handleTaskClick(ref.task_id)}
                            className="text-primary hover:underline truncate max-w-[200px] block text-left"
                          >
                            {ref.task_title}
                          </button>
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {ref.added_by ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
