import { useMemo, useState, useRef, useCallback } from 'react'
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
}

interface LayoutEdge {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  resolved: boolean
  blockingTitle: string
  blockingTeam: string
  blockingStatus: string
  waitingTitle: string
  waitingTeam: string
}

interface TooltipData {
  edge: LayoutEdge
  mouseX: number
  mouseY: number
}

interface MapProps {
  onEditTask: (task: Task) => void
}

export function DependencyMap({ onEditTask }: MapProps) {
  const { sprintId } = useFilters()
  const { data: tasks = [] } = useTasks({ sprintId })
  const { data: teams = [] } = useTeams()
  const { data: allDeps = [] } = useAllDependencies()
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const NODE_W = 200
  const NODE_H = 60
  const COL_GAP = 120
  const ROW_GAP = 28
  const PAD_X = 50
  const PAD_Y = 50

  const { nodes, edges, width, height, stats } = useMemo(() => {
    const taskIds = new Set(tasks.map(t => t.id))
    const relevantDeps = allDeps.filter(d => taskIds.has(d.blocking_task_id) && taskIds.has(d.waiting_task_id))

    const blocksMap = new Map<string, string[]>()
    const waitingOnMap = new Map<string, string[]>()
    for (const dep of relevantDeps) {
      if (!blocksMap.has(dep.blocking_task_id)) blocksMap.set(dep.blocking_task_id, [])
      blocksMap.get(dep.blocking_task_id)!.push(dep.waiting_task_id)
      if (!waitingOnMap.has(dep.waiting_task_id)) waitingOnMap.set(dep.waiting_task_id, [])
      waitingOnMap.get(dep.waiting_task_id)!.push(dep.blocking_task_id)
    }

    const connectedTaskIds = new Set<string>()
    for (const dep of relevantDeps) {
      connectedTaskIds.add(dep.blocking_task_id)
      connectedTaskIds.add(dep.waiting_task_id)
    }
    const connectedTasks = tasks.filter(t => connectedTaskIds.has(t.id))

    if (connectedTasks.length === 0) {
      return { nodes: [] as LayoutNode[], edges: [] as LayoutEdge[], width: 0, height: 0, stats: { total: 0, resolved: 0, pending: 0, bottlenecks: 0 } }
    }

    // Topological sort into columns
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

    const columns = new Map<number, Task[]>()
    for (const t of connectedTasks) {
      const col = depth.get(t.id) ?? 0
      if (!columns.has(col)) columns.set(col, [])
      columns.get(col)!.push(t)
    }

    const layoutNodes: LayoutNode[] = []
    let maxX = 0, maxY = 0

    for (const [col, colTasks] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
      colTasks.forEach((task, row) => {
        const team = teams.find(t => t.id === task.team_id)
        const x = PAD_X + col * (NODE_W + COL_GAP)
        const y = PAD_Y + row * (NODE_H + ROW_GAP)
        layoutNodes.push({ task, teamName: team?.name ?? '', x, y })
        maxX = Math.max(maxX, x + NODE_W)
        maxY = Math.max(maxY, y + NODE_H)
      })
    }

    const nodeMap = new Map(layoutNodes.map(n => [n.task.id, n]))
    const layoutEdges: LayoutEdge[] = relevantDeps.map(dep => {
      const from = nodeMap.get(dep.blocking_task_id)
      const to = nodeMap.get(dep.waiting_task_id)
      if (!from || !to) return null
      return {
        id: dep.id,
        fromX: from.x + NODE_W,
        fromY: from.y + NODE_H / 2,
        toX: to.x,
        toY: to.y + NODE_H / 2,
        resolved: from.task.status === 'done',
        blockingTitle: from.task.title,
        blockingTeam: from.teamName,
        blockingStatus: from.task.status,
        waitingTitle: to.task.title,
        waitingTeam: to.teamName,
      }
    }).filter(Boolean) as LayoutEdge[]

    const bottlenecks = connectedTasks.filter(t => (blocksMap.get(t.id)?.length ?? 0) >= 2).length
    const resolved = relevantDeps.filter(d => tasks.find(t => t.id === d.blocking_task_id)?.status === 'done').length

    return {
      nodes: layoutNodes,
      edges: layoutEdges,
      width: maxX + PAD_X,
      height: maxY + PAD_Y + 20,
      stats: { total: relevantDeps.length, resolved, pending: relevantDeps.length - resolved, bottlenecks },
    }
  }, [tasks, teams, allDeps, NODE_W, NODE_H, COL_GAP, ROW_GAP, PAD_X, PAD_Y])

  const handleEdgeMouseEnter = useCallback((edge: LayoutEdge, e: React.MouseEvent) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    hoverTimerRef.current = setTimeout(() => {
      setTooltip({ edge, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top })
    }, 200)
  }, [])

  const handleEdgeMouseMove = useCallback((edge: LayoutEdge, e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || !tooltip) return
    setTooltip({ edge, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top })
  }, [tooltip])

  const handleEdgeMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setTooltip(null)
  }, [])

  if (nodes.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No dependencies mapped yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add dependencies between tasks from the task edit dialog to see them visualized here.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="gap-1"><GitBranch className="h-3 w-3" />{stats.total} dependencies</Badge>
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3" />{stats.resolved} resolved</Badge>
        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3" />{stats.pending} pending</Badge>
        {stats.bottlenecks > 0 && <Badge variant="secondary" className="gap-1 bg-red-100 text-red-700">{stats.bottlenecks} bottleneck{stats.bottlenecks > 1 ? 's' : ''}</Badge>}
      </div>

      {/* Map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" />Dependency Map</CardTitle>
          <p className="text-xs text-muted-foreground">Tasks flow left to right. Hover arrows for details. Click nodes to edit.</p>
        </CardHeader>
        <CardContent className="overflow-auto relative" ref={containerRef}>
          <svg width={width} height={height} className="min-w-full">
            {/* Edges (render first, behind nodes) */}
            {edges.map((edge) => {
              const midX = (edge.fromX + edge.toX) / 2
              const isHovered = tooltip?.edge.id === edge.id
              return (
                <g key={edge.id}>
                  {/* Invisible wide hit area */}
                  <path
                    d={`M ${edge.fromX} ${edge.fromY} C ${midX} ${edge.fromY}, ${midX} ${edge.toY}, ${edge.toX} ${edge.toY}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={20}
                    className="cursor-pointer"
                    onMouseEnter={(e) => handleEdgeMouseEnter(edge, e)}
                    onMouseMove={(e) => handleEdgeMouseMove(edge, e)}
                    onMouseLeave={handleEdgeMouseLeave}
                  />
                  {/* Visible arrow */}
                  <path
                    d={`M ${edge.fromX} ${edge.fromY} C ${midX} ${edge.fromY}, ${midX} ${edge.toY}, ${edge.toX} ${edge.toY}`}
                    fill="none"
                    stroke={edge.resolved ? '#4ade80' : '#fbbf24'}
                    strokeWidth={isHovered ? 3 : 2}
                    strokeDasharray={edge.resolved ? '0' : '8 4'}
                    opacity={isHovered ? 1 : 0.6}
                    className="pointer-events-none transition-all duration-150"
                  />
                  {/* Arrow head */}
                  <polygon
                    points={`${edge.toX},${edge.toY} ${edge.toX - 10},${edge.toY - 5} ${edge.toX - 10},${edge.toY + 5}`}
                    fill={edge.resolved ? '#4ade80' : '#fbbf24'}
                    opacity={isHovered ? 1 : 0.6}
                    className="pointer-events-none"
                  />
                </g>
              )
            })}

            {/* Nodes (render second, on top of edges) */}
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
                  {/* Shadow */}
                  <rect
                    x={node.x + 2}
                    y={node.y + 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx={10}
                    fill="rgba(0,0,0,0.06)"
                    className="pointer-events-none"
                  />
                  {/* Card background */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={10}
                    fill={isDone ? '#f8fdf8' : 'white'}
                    stroke={isHovered ? color.border : isDone ? '#bbf7d0' : '#e5e7eb'}
                    strokeWidth={isHovered ? 2 : 1}
                  />
                  {/* Team color left bar */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={4}
                    height={NODE_H}
                    rx={2}
                    fill={color.border}
                  />
                  {/* Title */}
                  <text
                    x={node.x + 14}
                    y={node.y + 22}
                    fontSize={12}
                    fontWeight={600}
                    fill={isDone ? '#9ca3af' : '#1f2937'}
                    textDecoration={isDone ? 'line-through' : 'none'}
                  >
                    {node.task.title.length > 24 ? node.task.title.slice(0, 24) + '...' : node.task.title}
                  </text>
                  {/* Team + status */}
                  <text
                    x={node.x + 14}
                    y={node.y + 40}
                    fontSize={10}
                    fill={color.text}
                  >
                    {node.teamName}
                  </text>
                  <text
                    x={node.x + 14}
                    y={node.y + 52}
                    fontSize={9}
                    fill="#9ca3af"
                  >
                    {node.task.priority.charAt(0).toUpperCase() + node.task.priority.slice(1)} · {node.task.status === 'in_progress' ? 'In Progress' : node.task.status.charAt(0).toUpperCase() + node.task.status.slice(1).replace('_', ' ')}
                  </text>
                  {/* Done indicator */}
                  {isDone && (
                    <>
                      <circle cx={node.x + NODE_W - 16} cy={node.y + 16} r={8} fill="#22c55e" />
                      <text x={node.x + NODE_W - 20} y={node.y + 20} fontSize={10} fill="white" fontWeight={700}>✓</text>
                    </>
                  )}
                </g>
              )
            })}
          </svg>

          {/* HTML Tooltip — positioned absolutely over the SVG */}
          {tooltip && (
            <div
              className="absolute pointer-events-none z-50 animate-in fade-in-0 duration-150"
              style={{
                left: tooltip.mouseX + 16,
                top: tooltip.mouseY - 40,
              }}
            >
              <div className={`rounded-lg border shadow-lg px-4 py-3 text-sm bg-white max-w-[280px] ${
                tooltip.edge.resolved ? 'border-green-300' : 'border-amber-300'
              }`}>
                <div className={`text-[10px] font-semibold uppercase tracking-wide mb-2 ${
                  tooltip.edge.resolved ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {tooltip.edge.resolved ? 'Resolved' : 'Pending Dependency'}
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="font-semibold text-xs truncate">{tooltip.edge.blockingTitle}</p>
                    <p className="text-[10px] text-muted-foreground">{tooltip.edge.blockingTeam} · {tooltip.edge.blockingStatus === 'done' ? 'Done' : 'Not done'}</p>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>↓</span>
                    <span>blocks</span>
                  </div>

                  <div>
                    <p className="font-semibold text-xs truncate">{tooltip.edge.waitingTitle}</p>
                    <p className="text-[10px] text-muted-foreground">{tooltip.edge.waitingTeam}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
