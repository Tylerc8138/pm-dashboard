/** @purpose Dependency map visualization with cross-team highlighting, filters, and rich node cards */
import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTasks } from '@/hooks/use-tasks'
import { useTeams } from '@/hooks/use-teams'
import { useAllDependencies } from '@/hooks/use-dependencies'
import { useAllAssignees } from '@/hooks/use-assignees'
import { useMembers } from '@/hooks/use-members'
import { useFilters } from '@/contexts/filter-context'
import { GitBranch, AlertTriangle, CheckCircle2, ZoomIn, ZoomOut, Maximize2, Calendar } from 'lucide-react'
import type { Task, Member } from '@/types/database'
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
  isCrossTeam: boolean
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

const TEAM_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  PM: { bg: 'bg-purple-100', text: 'text-purple-700', hex: '#7c3aed' },
  Product: { bg: 'bg-blue-100', text: 'text-blue-700', hex: '#2563eb' },
  Marketing: { bg: 'bg-green-100', text: 'text-green-700', hex: '#16a34a' },
  Comms: { bg: 'bg-orange-100', text: 'text-orange-700', hex: '#ea580c' },
  Legal: { bg: 'bg-red-100', text: 'text-red-700', hex: '#dc2626' },
  'Search Strategy': { bg: 'bg-teal-100', text: 'text-teal-700', hex: '#0d9488' },
}
const DEFAULT_TC = { bg: 'bg-neutral-100', text: 'text-neutral-500', hex: '#737373' }

export function DependencyMap({ onEditTask }: MapProps) {
  const { sprintId } = useFilters()
  const { data: tasks = [] } = useTasks({ sprintId })
  const { data: teams = [] } = useTeams()
  const { data: allDeps = [] } = useAllDependencies()
  const { data: allAssignees = [] } = useAllAssignees()
  const { data: members = [] } = useMembers()

  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const [filterTeamId, setFilterTeamId] = useState<string | null>(null)

  const NODE_W = 180
  const NODE_H = 150
  const COL_GAP = 100
  const ROW_GAP = 40
  const PAD = 80

  const memberMap = useMemo(() => {
    const m = new Map<string, Member>()
    for (const mem of members) m.set(mem.id, mem)
    return m
  }, [members])

  // Assignees grouped by task_id
  const assigneesByTask = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const a of allAssignees) {
      if (!m.has(a.task_id)) m.set(a.task_id, [])
      m.get(a.task_id)!.push(a.member_id)
    }
    return m
  }, [allAssignees])

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

    // Apply team filter — show tasks that are in the team OR connected to a task in the team
    let connectedTasks = tasks.filter(t => connectedTaskIds.has(t.id))
    if (filterTeamId) {
      const teamTaskIds = new Set(connectedTasks.filter(t => t.team_id === filterTeamId).map(t => t.id))
      const relatedIds = new Set<string>()
      for (const dep of relevantDeps) {
        if (teamTaskIds.has(dep.blocking_task_id)) { relatedIds.add(dep.blocking_task_id); relatedIds.add(dep.waiting_task_id) }
        if (teamTaskIds.has(dep.waiting_task_id)) { relatedIds.add(dep.blocking_task_id); relatedIds.add(dep.waiting_task_id) }
      }
      connectedTasks = connectedTasks.filter(t => relatedIds.has(t.id))
    }

    if (connectedTasks.length === 0) {
      return { nodes: [] as LayoutNode[], edges: [] as LayoutEdge[], canvasW: 0, canvasH: 0, stats: { total: 0, resolved: 0, pending: 0, bottlenecks: 0, crossTeam: 0 } }
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

    const filteredConnectedIds = new Set(connectedTasks.map(t => t.id))
    const filteredDeps = relevantDeps.filter(d => filteredConnectedIds.has(d.blocking_task_id) && filteredConnectedIds.has(d.waiting_task_id))

    const nodeMap = new Map(layoutNodes.map(n => [n.task.id, n]))
    const layoutEdges: LayoutEdge[] = filteredDeps.map(dep => {
      const from = nodeMap.get(dep.blocking_task_id)
      const to = nodeMap.get(dep.waiting_task_id)
      if (!from || !to) return null
      const isCrossTeam = from.task.team_id !== to.task.team_id
      return {
        id: dep.id,
        fromX: from.x + NODE_W,
        fromY: from.y + NODE_H / 2,
        toX: to.x,
        toY: to.y + NODE_H / 2,
        resolved: from.task.status === 'done',
        isCrossTeam,
        blockingTitle: from.task.title, blockingTeam: from.teamName, blockingStatus: from.task.status,
        waitingTitle: to.task.title, waitingTeam: to.teamName,
      }
    }).filter(Boolean) as LayoutEdge[]

    const bottlenecks = connectedTasks.filter(t => (blocksMap.get(t.id)?.length ?? 0) >= 2).length
    const resolved = filteredDeps.filter(d => tasks.find(t => t.id === d.blocking_task_id)?.status === 'done').length
    const crossTeam = layoutEdges.filter(e => e.isCrossTeam).length

    return { nodes: layoutNodes, edges: layoutEdges, canvasW: maxX + PAD, canvasH: maxY + PAD, stats: { total: filteredDeps.length, resolved, pending: filteredDeps.length - resolved, bottlenecks, crossTeam } }
  }, [tasks, teams, allDeps, filterTeamId])

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

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => { e.preventDefault(); const delta = e.deltaY > 0 ? -0.08 : 0.08; setScale(s => Math.min(2, Math.max(0.3, s + delta))) }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const handleZoomIn = () => setScale(s => Math.min(2, s + 0.15))
  const handleZoomOut = () => setScale(s => Math.max(0.3, s - 0.15))
  const handleReset = () => { setScale(1); setTranslate({ x: 0, y: 0 }) }

  const handleEdgeMouseEnter = useCallback((edge: LayoutEdge, e: React.MouseEvent) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    hoverTimerRef.current = setTimeout(() => { setTooltip({ edge, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top }) }, 200)
  }, [])
  const handleEdgeMouseMoveEvt = useCallback((edge: LayoutEdge, e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || !tooltip) return
    setTooltip({ edge, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top })
  }, [tooltip])
  const handleEdgeMouseLeave = useCallback(() => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); setTooltip(null) }, [])

  // Get unique teams that appear in the dependency graph
  const graphTeams = useMemo(() => {
    const teamIds = new Set(nodes.map(n => n.task.team_id))
    return teams.filter(t => teamIds.has(t.id))
  }, [nodes, teams])

  if (nodes.length === 0 && !filterTeamId) {
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

  function getEdgeColor(edge: LayoutEdge) {
    if (edge.resolved) return '#a3a3a3'
    if (edge.isCrossTeam) return '#d97706' // amber for cross-team
    return '#1a1a1a' // dark for intra-team
  }

  return (
    <div className="p-6 space-y-4">
      {/* Stats + team filters + zoom */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1"><GitBranch className="h-3 w-3" />{stats.total} deps</Badge>
          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3" />{stats.resolved} resolved</Badge>
          <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3" />{stats.pending} pending</Badge>
          {stats.crossTeam > 0 && <Badge variant="secondary" className="gap-1 bg-amber-50 text-amber-600 border-amber-200">{stats.crossTeam} cross-team</Badge>}
          {stats.bottlenecks > 0 && <Badge variant="secondary" className="gap-1 bg-red-100 text-red-700">{stats.bottlenecks} bottleneck{stats.bottlenecks > 1 ? 's' : ''}</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={handleZoomOut} className="h-7 w-7 p-0"><ZoomOut className="h-3.5 w-3.5" /></Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} className="h-7 w-7 p-0"><ZoomIn className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="h-7 px-2 text-xs gap-1"><Maximize2 className="h-3 w-3" />Reset</Button>
        </div>
      </div>

      {/* Team filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Filter:</span>
        <Button
          variant={filterTeamId === null ? 'default' : 'outline'}
          size="sm"
          className="h-6 text-xs px-2"
          onClick={() => setFilterTeamId(null)}
        >All Teams</Button>
        {graphTeams.map(t => {
          const tc = TEAM_COLORS[t.name] ?? DEFAULT_TC
          return (
            <Button
              key={t.id}
              variant={filterTeamId === t.id ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-xs px-2 gap-1"
              onClick={() => setFilterTeamId(filterTeamId === t.id ? null : t.id)}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: tc.hex }} />
              {t.name}
            </Button>
          )
        })}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-lg border bg-[#fafafa] overflow-hidden select-none"
        style={{ height: 'calc(100vh - 280px)', cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, #d4d4d8 1px, transparent 1px)',
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${translate.x % (20 * scale)}px ${translate.y % (20 * scale)}px`,
        }} />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur border rounded-lg px-3 py-2 text-[10px] text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#1a1a1a" strokeWidth="1.5" /></svg>
            <span>Same team</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#d97706" strokeWidth="2" /></svg>
            <span>Cross-team</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#a3a3a3" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
            <span>Resolved</span>
          </div>
        </div>

        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: canvasW,
            height: canvasH,
          }}
        >
          <svg width={canvasW} height={canvasH} className="absolute inset-0 pointer-events-none">
            {edges.map((edge) => {
              const midX = (edge.fromX + edge.toX) / 2
              const isHovered = tooltip?.edge.id === edge.id
              const color = getEdgeColor(edge)
              const strokeW = edge.isCrossTeam ? 2 : 1.5
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
                    stroke={color}
                    strokeWidth={isHovered ? strokeW + 1 : strokeW}
                    strokeDasharray={edge.resolved ? '6 4' : '0'}
                    opacity={isHovered ? 1 : 0.5}
                  />
                  <polygon
                    points={`${edge.toX},${edge.toY} ${edge.toX - 8},${edge.toY - 4} ${edge.toX - 8},${edge.toY + 4}`}
                    fill={color}
                    opacity={isHovered ? 1 : 0.5}
                  />
                </g>
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const isDone = node.task.status === 'done'
            const tc = TEAM_COLORS[node.teamName] ?? DEFAULT_TC
            const taskAssigneeIds = assigneesByTask.get(node.task.id) ?? []
            const assignedMembers = taskAssigneeIds.map(id => memberMap.get(id)).filter(Boolean) as Member[]
            const isOverdue = node.task.due_date && !isDone && new Date(node.task.due_date) < new Date()

            return (
              <div
                key={node.task.id}
                data-node
                className={`absolute rounded-lg border-2 bg-white hover:shadow-lg transition-shadow cursor-pointer ${
                  isDone ? 'opacity-60 border-neutral-400' : isOverdue ? 'border-red-400' : 'border-neutral-900'
                }`}
                style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
                onClick={() => onEditTask(node.task)}
              >
                {/* Title */}
                <div className="px-3 pt-3 pb-1.5">
                  <p className={`text-[13px] font-semibold leading-tight line-clamp-2 ${isDone ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                    {node.task.title}
                  </p>
                </div>

                {/* Assignee avatars */}
                {assignedMembers.length > 0 && (
                  <div className="px-3 pb-1 flex items-center gap-0.5">
                    {assignedMembers.slice(0, 3).map(m => (
                      <div key={m.id} className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-white text-[8px] font-medium" title={m.full_name}>
                        {m.full_name.split(' ').map(n => n[0]).join('')}
                      </div>
                    ))}
                    {assignedMembers.length > 3 && (
                      <span className="text-[9px] text-muted-foreground ml-0.5">+{assignedMembers.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="mx-3 border-t border-neutral-200" />

                {/* Bottom: team + priority + due date */}
                <div className="px-3 pt-1.5 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-semibold ${tc.bg} ${tc.text}`}>
                      {node.teamName.charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-[11px] font-medium ${tc.text}`}>{node.teamName}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {node.task.due_date && (
                      <span className={`text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5 ${
                        isOverdue ? 'bg-red-100 text-red-600 font-semibold' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(node.task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      node.task.priority === 'high' ? 'bg-red-100 text-red-700' :
                      node.task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {node.task.priority?.[0]?.toUpperCase()}{node.task.priority?.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Status bar */}
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

        {/* Tooltip */}
        {tooltip && (
          <div className="absolute pointer-events-none z-50 animate-in fade-in-0 duration-100" style={{ left: tooltip.mouseX + 16, top: tooltip.mouseY - 30 }}>
            <div className="rounded-lg border border-neutral-200 shadow-lg px-4 py-3 bg-white max-w-[280px]">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                  tooltip.edge.resolved ? 'text-neutral-400' : tooltip.edge.isCrossTeam ? 'text-amber-600' : 'text-neutral-900'
                }`}>
                  {tooltip.edge.resolved ? 'Resolved' : tooltip.edge.isCrossTeam ? 'Cross-Team Dependency' : 'Same-Team Dependency'}
                </span>
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
