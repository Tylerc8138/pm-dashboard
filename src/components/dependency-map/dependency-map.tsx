import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTasks } from '@/hooks/use-tasks'
import { useTeams } from '@/hooks/use-teams'
import { useAllDependencies } from '@/hooks/use-dependencies'
import { useFilters } from '@/contexts/filter-context'
import { GitBranch, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Task } from '@/types/database'

const TEAM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PM: { bg: '#f3e8ff', border: '#9333ea', text: '#7e22ce' },
  Product: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  Marketing: { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
  Comms: { bg: '#ffedd5', border: '#f97316', text: '#c2410c' },
  Legal: { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' },
  'Search Strategy': { bg: '#ccfbf1', border: '#14b8a6', text: '#0f766e' },
}

const DEFAULT_COLOR = { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' }

interface LayoutNode {
  task: Task
  teamName: string
  x: number
  y: number
  column: number
  row: number
}

interface MapProps {
  onEditTask: (task: Task) => void
}

export function DependencyMap({ onEditTask }: MapProps) {
  const { sprintId } = useFilters()
  const { data: tasks = [] } = useTasks({ sprintId })
  const { data: teams = [] } = useTeams()
  const { data: allDeps = [] } = useAllDependencies()
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)

  const { nodes, edges, width, height, stats } = useMemo(() => {
    // Filter deps to only include tasks in current view
    const taskIds = new Set(tasks.map(t => t.id))
    const relevantDeps = allDeps.filter(d => taskIds.has(d.blocking_task_id) && taskIds.has(d.waiting_task_id))

    // Build adjacency: blocking -> [waiting tasks]
    const blocksMap = new Map<string, string[]>()
    const waitingOnMap = new Map<string, string[]>()
    for (const dep of relevantDeps) {
      if (!blocksMap.has(dep.blocking_task_id)) blocksMap.set(dep.blocking_task_id, [])
      blocksMap.get(dep.blocking_task_id)!.push(dep.waiting_task_id)
      if (!waitingOnMap.has(dep.waiting_task_id)) waitingOnMap.set(dep.waiting_task_id, [])
      waitingOnMap.get(dep.waiting_task_id)!.push(dep.blocking_task_id)
    }

    // Only show tasks that have dependencies
    const connectedTaskIds = new Set<string>()
    for (const dep of relevantDeps) {
      connectedTaskIds.add(dep.blocking_task_id)
      connectedTaskIds.add(dep.waiting_task_id)
    }

    const connectedTasks = tasks.filter(t => connectedTaskIds.has(t.id))

    if (connectedTasks.length === 0) {
      return { nodes: [], edges: [], width: 0, height: 0, stats: { total: 0, resolved: 0, pending: 0, bottlenecks: 0 } }
    }

    // Topological sort into columns (depth from roots)
    const depth = new Map<string, number>()
    const visited = new Set<string>()

    function getDepth(id: string): number {
      if (depth.has(id)) return depth.get(id)!
      if (visited.has(id)) return 0
      visited.add(id)
      const parents = waitingOnMap.get(id) ?? []
      const d = parents.length === 0 ? 0 : Math.max(...parents.map(p => getDepth(p) + 1))
      depth.set(id, d)
      return d
    }

    for (const t of connectedTasks) getDepth(t.id)

    // Group by column
    const columns = new Map<number, Task[]>()
    for (const t of connectedTasks) {
      const col = depth.get(t.id) ?? 0
      if (!columns.has(col)) columns.set(col, [])
      columns.get(col)!.push(t)
    }

    // Layout
    const nodeW = 220
    const nodeH = 70
    const colGap = 100
    const rowGap = 24
    const padX = 40
    const padY = 40

    const layoutNodes: LayoutNode[] = []
    let maxX = 0
    let maxY = 0

    const sortedCols = [...columns.entries()].sort((a, b) => a[0] - b[0])
    for (const [col, colTasks] of sortedCols) {
      colTasks.forEach((task, row) => {
        const team = teams.find(t => t.id === task.team_id)
        const x = padX + col * (nodeW + colGap)
        const y = padY + row * (nodeH + rowGap)
        layoutNodes.push({ task, teamName: team?.name ?? '', x, y, column: col, row })
        maxX = Math.max(maxX, x + nodeW)
        maxY = Math.max(maxY, y + nodeH)
      })
    }

    // Build edges
    const nodeMap = new Map(layoutNodes.map(n => [n.task.id, n]))
    const layoutEdges = relevantDeps.map(dep => {
      const from = nodeMap.get(dep.blocking_task_id)
      const to = nodeMap.get(dep.waiting_task_id)
      if (!from || !to) return null
      return {
        id: dep.id,
        fromX: from.x + nodeW,
        fromY: from.y + nodeH / 2,
        toX: to.x,
        toY: to.y + nodeH / 2,
        resolved: from.task.status === 'done',
      }
    }).filter(Boolean) as { id: string; fromX: number; fromY: number; toX: number; toY: number; resolved: boolean }[]

    // Stats
    const bottlenecks = connectedTasks.filter(t => (blocksMap.get(t.id)?.length ?? 0) >= 2).length
    const resolved = relevantDeps.filter(d => {
      const bt = tasks.find(t => t.id === d.blocking_task_id)
      return bt?.status === 'done'
    }).length

    return {
      nodes: layoutNodes,
      edges: layoutEdges,
      width: maxX + padX,
      height: maxY + padY + 20,
      stats: {
        total: relevantDeps.length,
        resolved,
        pending: relevantDeps.length - resolved,
        bottlenecks,
      },
    }
  }, [tasks, teams, allDeps])

  if (nodes.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No dependencies mapped yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add dependencies between tasks from the task edit dialog to see them visualized here.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="gap-1">
          <GitBranch className="h-3 w-3" />
          {stats.total} dependencies
        </Badge>
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          {stats.resolved} resolved
        </Badge>
        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700">
          <AlertTriangle className="h-3 w-3" />
          {stats.pending} pending
        </Badge>
        {stats.bottlenecks > 0 && (
          <Badge variant="secondary" className="gap-1 bg-red-100 text-red-700">
            {stats.bottlenecks} bottleneck{stats.bottlenecks > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Dependency Map
          </CardTitle>
          <p className="text-xs text-muted-foreground">Tasks flow left to right. Arrows show "blocks" relationships.</p>
        </CardHeader>
        <CardContent className="overflow-auto">
          <svg width={width} height={height} className="min-w-full">
            {/* Edges */}
            {edges.map((edge) => {
              const midX = (edge.fromX + edge.toX) / 2
              return (
                <g key={edge.id}>
                  <path
                    d={`M ${edge.fromX} ${edge.fromY} C ${midX} ${edge.fromY}, ${midX} ${edge.toY}, ${edge.toX} ${edge.toY}`}
                    fill="none"
                    stroke={edge.resolved ? '#86efac' : '#fbbf24'}
                    strokeWidth={2}
                    strokeDasharray={edge.resolved ? '0' : '6 3'}
                    opacity={0.7}
                  />
                  {/* Arrow head */}
                  <polygon
                    points={`${edge.toX},${edge.toY} ${edge.toX - 8},${edge.toY - 4} ${edge.toX - 8},${edge.toY + 4}`}
                    fill={edge.resolved ? '#86efac' : '#fbbf24'}
                    opacity={0.7}
                  />
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const color = TEAM_COLORS[node.teamName] ?? DEFAULT_COLOR
              const isDone = node.task.status === 'done'
              const isHovered = hoveredTaskId === node.task.id

              return (
                <g
                  key={node.task.id}
                  onClick={() => onEditTask(node.task)}
                  onMouseEnter={() => setHoveredTaskId(node.task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={220}
                    height={70}
                    rx={8}
                    fill={isDone ? '#f0fdf4' : color.bg}
                    stroke={isHovered ? color.border : isDone ? '#86efac' : color.border}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    opacity={isDone ? 0.7 : 1}
                  />
                  {/* Team color bar */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={5}
                    height={70}
                    rx={3}
                    fill={color.border}
                  />
                  {/* Title */}
                  <text
                    x={node.x + 14}
                    y={node.y + 22}
                    fontSize={12}
                    fontWeight={600}
                    fill={isDone ? '#6b7280' : '#1f2937'}
                    textDecoration={isDone ? 'line-through' : 'none'}
                  >
                    {node.task.title.length > 28 ? node.task.title.slice(0, 28) + '...' : node.task.title}
                  </text>
                  {/* Team name */}
                  <text
                    x={node.x + 14}
                    y={node.y + 40}
                    fontSize={10}
                    fill={color.text}
                  >
                    {node.teamName}
                  </text>
                  {/* Status */}
                  <text
                    x={node.x + 14}
                    y={node.y + 56}
                    fontSize={10}
                    fill="#9ca3af"
                  >
                    {node.task.priority.charAt(0).toUpperCase() + node.task.priority.slice(1)} · {node.task.status === 'in_progress' ? 'In Progress' : node.task.status.charAt(0).toUpperCase() + node.task.status.slice(1).replace('_', ' ')}
                  </text>
                  {/* Done checkmark */}
                  {isDone && (
                    <circle cx={node.x + 205} cy={node.y + 15} r={8} fill="#22c55e" opacity={0.8} />
                  )}
                  {isDone && (
                    <text x={node.x + 201} y={node.y + 19} fontSize={11} fill="white" fontWeight={700}>✓</text>
                  )}
                </g>
              )
            })}
          </svg>
        </CardContent>
      </Card>
    </div>
  )
}
