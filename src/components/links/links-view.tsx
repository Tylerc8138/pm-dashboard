import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAllReferences } from '@/hooks/use-all-references'
import { useFilters } from '@/contexts/filter-context'
import { useTasks } from '@/hooks/use-tasks'
import { ExternalLink, FileText, LinkIcon, Image as ImageIcon } from 'lucide-react'
import type { Task } from '@/types/database'
import type { EnrichedReference } from '@/hooks/use-all-references'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.length > 30 ? parsed.pathname.slice(0, 30) + '...' : parsed.pathname
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
      if (!map[ref.team_id]) map[ref.team_id] = { teamName: ref.team_name, refs: [] }
      map[ref.team_id].refs.push(ref)
    }
    return Object.entries(map).sort(([, a], [, b]) => a.teamName.localeCompare(b.teamName))
  }, [references])

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task) onEditTask(task)
  }

  const totalLinks = references.filter((r) => r.type === 'link').length
  const totalImages = references.filter((r) => r.type === 'image').length

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading links...</div>
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
            <p className="text-sm text-muted-foreground">All reference materials across the project, organized by team</p>
          </div>
          <div className="flex gap-2">
            {totalLinks > 0 && (
              <Badge variant="secondary" className="text-sm gap-1">
                <ExternalLink className="h-3 w-3" />
                {totalLinks} {totalLinks === 1 ? 'link' : 'links'}
              </Badge>
            )}
            {totalImages > 0 && (
              <Badge variant="secondary" className="text-sm gap-1">
                <ImageIcon className="h-3 w-3" />
                {totalImages} {totalImages === 1 ? 'screenshot' : 'screenshots'}
              </Badge>
            )}
          </div>
        </div>

        {grouped.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No references yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add links or screenshots to tasks from the Board view.</p>
            </CardContent>
          </Card>
        )}

        {grouped.map(([teamId, { teamName, refs }]) => {
          const teamLinks = refs.filter((r) => r.type === 'link')
          const teamImages = refs.filter((r) => r.type === 'image')

          return (
            <Card key={teamId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {teamName}
                    <Badge variant="secondary" className="text-xs">{refs.length}</Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Links table */}
                {teamLinks.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs font-medium text-muted-foreground">
                          <th className="pb-2 pr-4 text-left w-6"></th>
                          <th className="pb-2 pr-4 text-left">Document Name</th>
                          <th className="pb-2 pr-4 text-left">Link</th>
                          <th className="pb-2 pr-4 text-left">Date Added</th>
                          <th className="pb-2 pr-4 text-left">Task</th>
                          <th className="pb-2 text-left">Added By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamLinks.map((ref) => (
                          <tr key={ref.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 pr-2"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></td>
                            <td className="py-2.5 pr-4 font-medium">{ref.label}</td>
                            <td className="py-2.5 pr-4">
                              <a href={ref.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                <span className="truncate max-w-[200px]">{truncateUrl(ref.url)}</span>
                              </a>
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{formatDate(ref.created_at)}</td>
                            <td className="py-2.5 pr-4">
                              <button onClick={() => handleTaskClick(ref.task_id)} className="text-primary hover:underline truncate max-w-[200px] block text-left">
                                {ref.task_title}
                              </button>
                            </td>
                            <td className="py-2.5 text-muted-foreground">{ref.added_by ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Screenshots grid */}
                {teamImages.length > 0 && (
                  <>
                    {teamLinks.length > 0 && (
                      <div className="flex items-center gap-2 pt-2">
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Screenshots</span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      {teamImages.map((ref) => (
                        <div key={ref.id} className="rounded-md border overflow-hidden hover:shadow-md transition-shadow">
                          <a href={ref.url} target="_blank" rel="noopener noreferrer">
                            <img src={ref.url} alt={ref.label} className="w-full h-28 object-cover" />
                          </a>
                          <div className="px-2.5 py-2 space-y-0.5">
                            <p className="text-xs font-medium truncate">{ref.label}</p>
                            <button onClick={() => handleTaskClick(ref.task_id)} className="text-[10px] text-primary hover:underline truncate block">
                              {ref.task_title}
                            </button>
                            <p className="text-[10px] text-muted-foreground">{formatDate(ref.created_at)}{ref.added_by ? ` by ${ref.added_by}` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
