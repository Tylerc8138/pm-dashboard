import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTasks } from '@/hooks/use-tasks'
import { useTeams } from '@/hooks/use-teams'
import { useAllDependencies } from '@/hooks/use-dependencies'
import { useFilters } from '@/contexts/filter-context'
import { GitBranch, AlertTriangle, CheckCircle2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import type { Task } from '@/types/database'
import React from 'react'

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
  const canvasRef = useRef<HTMLDivElement>(null)

  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pan + zoom state
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  const NODE_W = 160
  const NODE_H = 140
  const COL_GAP = 100
  const ROW_GAP = 40
  const PAD = 80

  const { nodes, edges, canvasW, canvasH, stats } = useMemo(() => {
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
    for (const dep of relevantDeps) { connectedTaskIds.add(dep.blocking_task_id); connectedTaskIds.add(dep.waiting_task_id) }
    const connectedTasks = tasks.filter(t => connectedTaskIds.has(t.id))

    if (connectedTasks.length === 0) {
      return { nodes: [] as LayoutNode[], edges: [] as LayoutEdge[], canvasW: 0, canvasH: 0, stats: { total: 0, resolved: 0, pending: 0, bottlenecks: 0 } }
    }

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
    for (const t of connectedTasks) { const col = depth.get(t.id) ?? 0; if (!columns.has(col)) columns.set(col, []); columns.get(col)!.push(t) }

    const layoutNodes: LayoutNode[] = []
    let maxX = 0, maxY = 0
    for (const [col, colTasks] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
      colTasks.forEach((task, row) => {
        const team = teams.find(t => t.id === task.team_id)
        const x = PAD + col * (NODE_W + COL_GAP)
        const y = PAD + row * (NODE_H + ROW_GAP)
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
        blockingTitle: from.task.title, blockingTeam: from.teamName, blockingStatus: from.task.status,
        waitingTitle: to.task.title, waitingTeam: to.teamName,
      }
    }).filter(Boolean) as LayoutEdge[]

    const bottlenecks = connectedTasks.filter(t => (blocksMap.get(t.id)?.length ?? 0) >= 2).length
    const resolved = relevantDeps.filter(d => tasks.find(t => t.id === d.blocking_task_id)?.status === 'done').length

    return { nodes: layoutNodes, edges: layoutEdges, canvasW: maxX + PAD, canvasH: maxY + PAD, stats: { total: relevantDeps.length, resolved, pending: relevantDeps.length - resolved, bottlenecks } }
  }, [tasks, teams, allDeps])

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y }
  }, [translate])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setTranslate({ x: panStart.current.tx + dx, y: panStart.current.ty + dy })
  }, [isPanning])

  const handleMouseUp = useCallback(() => { setIsPanning(false) }, [])

  // Zoom with scroll wheel
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.08 : 0.08
      setScale(s => Math.min(2, Math.max(0.3, s + delta)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const handleZoomIn = () => setScale(s => Math.min(2, s + 0.15))
  const handleZoomOut = () => setScale(s => Math.max(0.3, s - 0.15))
  const handleReset = () => { setScale(1); setTranslate({ x: 0, y: 0 }) }

  // Edge hover
  const handleEdgeMouseEnter = useCallback((edge: LayoutEdge, e: React.MouseEvent) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    hoverTimerRef.current = setTimeout(() => {
      setTooltip({ edge, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top })
    }, 200)
  }, [])

  const handleEdgeMouseMoveEvt = useCallback((edge: LayoutEdge, e: React.MouseEvent) => {
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
            <p className="text-xs text-muted-foreground mt-1">Add dependencies between tasks to see them here.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Stats + zoom controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1"><GitBranch className="h-3 w-3" />{stats.total} dependencies</Badge>
          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3" />{stats.resolved} resolved</Badge>
          <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3" />{stats.pending} pending</Badge>
          {stats.bottlenecks > 0 && <Badge variant="secondary" className="gap-1 bg-red-100 text-red-700">{stats.bottlenecks} bottleneck{stats.bottlenecks > 1 ? 's' : ''}</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={handleZoomOut} className="h-7 w-7 p-0"><ZoomOut className="h-3.5 w-3.5" /></Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} className="h-7 w-7 p-0"><ZoomIn className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="h-7 px-2 text-xs gap-1"><Maximize2 className="h-3 w-3" />Reset</Button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-lg border bg-[#fafafa] overflow-hidden select-none"
        style={{ height: 'calc(100vh - 240px)', cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Dot grid background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, #d4d4d8 1px, transparent 1px)',
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${translate.x % (20 * scale)}px ${translate.y % (20 * scale)}px`,
        }} />

        <div
          ref={canvasRef}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: canvasW,
            height: canvasH,
          }}
        >
          <svg width={canvasW} height={canvasH} className="absolute inset-0 pointer-events-none">
            {/* Edges */}
            {edges.map((edge) => {
              const midX = (edge.fromX + edge.toX) / 2
              const isHovered = tooltip?.edge.id === edge.id
              return (
                <g key={edge.id}>
                  <path
                    d={`M ${edge.fromX} ${edge.fromY} C ${midX} ${edge.fromY}, ${midX} ${edge.toY}, ${edge.toX} ${edge.toY}`}
                    fill="none" stroke="transparent" strokeWidth={20}
                    className="cursor-pointer pointer-events-auto"
                    onMouseEnter={(e) => handleEdgeMouseEnter(edge, e)}
                    onMouseMove={(e) => handleEdgeMouseMoveEvt(edge, e)}
                    onMouseLeave={handleEdgeMouseLeave}
                  />
                  <path
                    d={`M ${edge.fromX} ${edge.fromY} C ${midX} ${edge.fromY}, ${midX} ${edge.toY}, ${edge.toX} ${edge.toY}`}
                    fill="none"
                    stroke={edge.resolved ? '#a3a3a3' : '#1a1a1a'}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    strokeDasharray={edge.resolved ? '6 4' : '0'}
                    opacity={isHovered ? 1 : 0.4}
                  />
                  <polygon
                    points={`${edge.toX},${edge.toY} ${edge.toX - 8},${edge.toY - 4} ${edge.toX - 8},${edge.toY + 4}`}
                    fill={edge.resolved ? '#a3a3a3' : '#1a1a1a'}
                    opacity={isHovered ? 1 : 0.4}
                  />
                </g>
              )
            })}
          </svg>

          {/* Nodes as HTML divs (Notion-style cards) */}
          {nodes.map((node) => {
            const isDone = node.task.status === 'done'
            const teamInitial = node.teamName.charAt(0).toUpperCase()

            return (
              <div
                key={node.task.id}
                data-node
                className={`absolute rounded-lg border bg-white hover:shadow-md transition-shadow cursor-pointer ${
                  isDone ? 'opacity-60' : ''
                }`}
                style={{
                  left: node.x, top: node.y,
                  width: NODE_W, height: NODE_H,
                  borderColor: isDone ? '#d4d4d4' : '#e5e5e5',
                }}
                onClick={() => onEditTask(node.task)}
              >
                {/* Top section */}
                <div className="px-3 pt-3 pb-2">
                  <p className={`text-[13px] font-semibold leading-tight line-clamp-2 ${isDone ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                    {node.task.title}
                  </p>
                </div>

                {/* Divider */}
                <div className="mx-3 border-t border-neutral-100" />

                {/* Bottom section */}
                <div className="px-3 pt-2 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-neutral-100 text-[9px] font-semibold text-neutral-500">
                      {teamInitial}
                    </div>
                    <span className="text-[11px] text-neutral-500">{node.teamName}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isDone && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white text-[9px]">✓</div>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      node.task.priority === 'high' ? 'bg-neutral-900 text-white' :
                      node.task.priority === 'medium' ? 'bg-neutral-200 text-neutral-700' :
                      'bg-neutral-100 text-neutral-400'
                    }`}>
                      {node.task.priority.charAt(0).toUpperCase() + node.task.priority.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Status bar at bottom */}
                <div className={`h-1 rounded-b-lg ${
                  node.task.status === 'done' ? 'bg-neutral-300' :
                  node.task.status === 'in_progress' ? 'bg-neutral-900' :
                  node.task.status === 'todo' ? 'bg-neutral-400' :
                  'bg-neutral-200'
                }`} />
              </div>
            )
          })}
        </div>

        {/* HTML Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-50 animate-in fade-in-0 duration-100"
            style={{ left: tooltip.mouseX + 16, top: tooltip.mouseY - 30 }}
          >
            <div className="rounded-lg border border-neutral-200 shadow-lg px-4 py-3 bg-white max-w-[260px]">
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                tooltip.edge.resolved ? 'text-neutral-400' : 'text-neutral-900'
              }`}>
                {tooltip.edge.resolved ? 'Resolved' : 'Pending'}
              </div>
              <div className="space-y-1.5">
                <div>
                  <p className="font-semibold text-xs text-neutral-900 truncate">{tooltip.edge.blockingTitle}</p>
                  <p className="text-[10px] text-neutral-500">{tooltip.edge.blockingTeam} · {tooltip.edge.blockingStatus === 'done' ? 'Done' : 'Not done'}</p>
                </div>
                <p className="text-[10px] text-neutral-400">↓ blocks</p>
                <div>
                  <p className="font-semibold text-xs text-neutral-900 truncate">{tooltip.edge.waitingTitle}</p>
                  <p className="text-[10px] text-neutral-500">{tooltip.edge.waitingTeam}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
