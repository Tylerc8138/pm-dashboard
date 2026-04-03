/** @purpose Project overview with DB-backed North Star, sprint details, and metrics — editable by PM users */
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useSprints, useUpdateSprint } from '@/hooks/use-sprints'
import { useTasks } from '@/hooks/use-tasks'
import { useTeams } from '@/hooks/use-teams'
import { useMembers } from '@/hooks/use-members'
import { useCurrentMember } from '@/hooks/use-current-member'
import { useProjectSettings, useUpsertProjectSetting } from '@/hooks/use-project-settings'
import { Target, Rocket, Calendar, CheckCircle2, TrendingUp, Users, BarChart3, Pencil, Save, X, Plus, Trash2 } from 'lucide-react'

const PM_OVERRIDE_EMAILS = ['tylerxcheung@gmail.com', 'tylcheun@visa.com']

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Hardcoded fallbacks for sprints that don't have DB content yet
const SPRINT_DEFAULTS: Record<number, { description: string; deliverables: string[]; keyActivities: string[] }> = {
  1: {
    description: 'Rapidly assess where Visa stands today in agentic commerce content. Understand the gaps, audit technical SEO health, and benchmark against Stripe.',
    deliverables: ['Baseline Report', 'Technical + Content SEO Scorecard', 'Directional Competitor Benchmark'],
    keyActivities: ['Audit existing content on Visa.com + Developer.visa.com', 'Run SEO health audit (performance, crawlability, structured data)', 'Benchmark Visa vs. Stripe across developer channels', 'Document internal constraints (legal, brand, publishing workflow)'],
  },
  2: {
    description: 'Define who we are building for, where they spend time, and what content we need to produce.',
    deliverables: ['Developer Segmentation Framework', 'Cross-Channel Map', 'Tiered Content Framework + Channel/Owner Matrix'],
    keyActivities: ['Define 3-tier developer personas', 'Map where developers + LLMs discover payment content', 'Build tiered content strategy', 'Assign channels and internal owners to each content type'],
  },
  3: {
    description: 'Test whether AI tools can replace agency-level content production.',
    deliverables: ['AI Capability Assessment Report'],
    keyActivities: ['Test AI content generation for Tier 1 explainer', 'Test AI content generation for Tier 2 how-to guide', 'Document AI capabilities vs. human expertise requirements', 'Draft internal capability assessment: AI tools vs. agency'],
  },
  4: {
    description: 'Ship real content. Produce 3 pilot assets, route through Legal, publish, and set up measurement.',
    deliverables: ['3 Launch-Ready Assets', 'Measurement Framework (Draft)'],
    keyActivities: ['Produce 1x Discovery/Explainer', 'Produce 1x How To guide', 'Produce 1x Technical Code Asset', 'Set up LLM citation tracking and baseline metrics'],
  },
  5: {
    description: 'Analyze what worked from the pilot, optimize underperforming content, scale production.',
    deliverables: ['Performance Analysis Report', 'Q3 Content Roadmap'],
    keyActivities: ['Analyze pilot content performance', 'Optimize content based on SERP and citation data', 'Scale production on effective formats', 'Plan next quarter roadmap'],
  },
}

const DEFAULT_KEY_METRICS = [
  { category: 'Developer Adoption', metrics: ['Active Visa CLI integrations', 'GitHub stars and MCP registry downloads', 'Developer portal unique visitors', 'Tutorial completion rate'] },
  { category: 'GEO / AEO Performance', metrics: ['LLM citation rate', 'Featured snippet ownership', 'Google AI Overview appearances', 'Organic traffic to target GEO pages'] },
  { category: 'Content & Brand', metrics: ['Earned media placements', 'Share of Voice vs. competitors', 'Thought leadership articles published', 'Developer community mentions'] },
]

export function OverviewPage() {
  const { data: sprints = [] } = useSprints()
  const { data: tasks = [] } = useTasks()
  const { data: teams = [] } = useTeams()
  const { data: members = [] } = useMembers()
  const { data: currentMember } = useCurrentMember()
  const { data: settings = [] } = useProjectSettings()
  const upsertSetting = useUpsertProjectSetting()
  const updateSprint = useUpdateSprint()

  const memberTeam = teams.find(t => t.id === currentMember?.team_id)
  const isPm = memberTeam?.name === 'PM' || (currentMember?.email && PM_OVERRIDE_EMAILS.includes(currentMember.email))

  // Project settings from DB
  const northStar = settings.find(s => s.key === 'north_star')?.value as { title?: string; description?: string } | null
  const planEnables = settings.find(s => s.key === 'plan_enables')?.value as string[] | null
  const keyMetrics = settings.find(s => s.key === 'key_metrics')?.value as { category: string; metrics: string[] }[] | null

  // Edit states
  const [editingNorthStar, setEditingNorthStar] = useState(false)
  const [nsTitle, setNsTitle] = useState('')
  const [nsDesc, setNsDesc] = useState('')

  const [editingPlanEnables, setEditingPlanEnables] = useState(false)
  const [planItems, setPlanItems] = useState<string[]>([])

  const [editingSprintId, setEditingSprintId] = useState<string | null>(null)
  const [sprintGoalEdit, setSprintGoalEdit] = useState('')
  const [sprintDeliverablesEdit, setSprintDeliverablesEdit] = useState<string[]>([])
  const [sprintActivitiesEdit, setSprintActivitiesEdit] = useState<string[]>([])

  const overallStats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter(t => t.status === 'done').length
    const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length
    const blocked = tasks.filter(t => t.is_blocked).length
    return { total, done, highPriority, blocked }
  }, [tasks])

  // North Star handlers
  const startEditNorthStar = () => {
    setNsTitle(northStar?.title ?? 'North Star')
    setNsDesc(northStar?.description ?? '')
    setEditingNorthStar(true)
  }
  const saveNorthStar = () => {
    upsertSetting.mutate({ key: 'north_star', value: { title: nsTitle, description: nsDesc } })
    setEditingNorthStar(false)
  }

  // Plan Enables handlers
  const startEditPlan = () => {
    setPlanItems([...(planEnables ?? [])])
    setEditingPlanEnables(true)
  }
  const savePlanEnables = () => {
    upsertSetting.mutate({ key: 'plan_enables', value: planItems.filter(i => i.trim()) })
    setEditingPlanEnables(false)
  }

  // Sprint detail handlers
  const startEditSprint = (sprint: typeof sprints[0]) => {
    const defaults = SPRINT_DEFAULTS[sprint.number]
    setSprintGoalEdit(sprint.goal ?? defaults?.description ?? '')
    setSprintDeliverablesEdit([...(sprint.deliverables?.length ? sprint.deliverables : defaults?.deliverables ?? [])])
    setSprintActivitiesEdit([...(sprint.key_activities?.length ? sprint.key_activities : defaults?.keyActivities ?? [])])
    setEditingSprintId(sprint.id)
  }
  const saveSprint = () => {
    if (!editingSprintId) return
    updateSprint.mutate({
      id: editingSprintId,
      goal: sprintGoalEdit,
      deliverables: sprintDeliverablesEdit.filter(d => d.trim()),
      key_activities: sprintActivitiesEdit.filter(a => a.trim()),
    })
    setEditingSprintId(null)
  }

  const displayNorthStarTitle = northStar?.title ?? 'North Star'
  const displayNorthStarDesc = northStar?.description ?? 'Get Vibe Coders & Developers to discover, understand, and adopt Visa\'s Agentic Commerce capabilities'
  const displayPlanEnables = planEnables ?? [
    'Show up consistently across developer-centric channels',
    'Increase visibility in LLM-driven searches',
    'Launch meaningful pilot assets across YouTube, GitHub/Substack, and Visa properties',
    'Understand internal capacity (with AI tools) vs. external investment required',
    'Implement a measurement framework to track performance',
  ]
  const displayMetrics = keyMetrics ?? DEFAULT_KEY_METRICS

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-8 p-6 pb-12">

        {/* Hero / North Star */}
        <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground relative group">
          {isPm && !editingNorthStar && (
            <Button variant="ghost" size="sm" onClick={startEditNorthStar} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white hover:bg-white/10 h-7 w-7 p-0">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}

          {editingNorthStar ? (
            <div className="space-y-3">
              <Input value={nsTitle} onChange={e => setNsTitle(e.target.value)} className="bg-white/20 border-white/30 text-white placeholder:text-white/50 font-bold text-lg" placeholder="Section title" />
              <Textarea value={nsDesc} onChange={e => setNsDesc(e.target.value)} className="bg-white/20 border-white/30 text-white placeholder:text-white/50 min-h-[80px]" placeholder="North star description" rows={3} />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditingNorthStar(false)} className="text-white/70 hover:text-white hover:bg-white/10"><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
                <Button size="sm" onClick={saveNorthStar} className="bg-white/20 hover:bg-white/30 text-white"><Save className="h-3.5 w-3.5 mr-1" />Save</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/70 uppercase tracking-wide">{displayNorthStarTitle}</p>
                <h1 className="text-xl font-bold mt-1 leading-snug">{displayNorthStarDesc}</h1>
              </div>
            </div>
          )}
        </div>

        {/* What This Plan Enables */}
        <Card className="relative group">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                What This Plan Enables
              </CardTitle>
              {isPm && !editingPlanEnables && (
                <Button variant="ghost" size="sm" onClick={startEditPlan} className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingPlanEnables ? (
              <div className="space-y-2">
                {planItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={item} onChange={e => { const n = [...planItems]; n[i] = e.target.value; setPlanItems(n) }} className="text-sm" />
                    <Button variant="ghost" size="sm" onClick={() => setPlanItems(planItems.filter((_, j) => j !== i))} className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setPlanItems([...planItems, ''])} className="text-xs gap-1"><Plus className="h-3 w-3" />Add item</Button>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingPlanEnables(false)}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
                  <Button size="sm" onClick={savePlanEnables}><Save className="h-3.5 w-3.5 mr-1" />Save</Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {displayPlanEnables.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Overall Progress */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{overallStats.done}/{overallStats.total}</p><p className="text-xs text-muted-foreground mt-1">Tasks Completed</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{sprints.length}</p><p className="text-xs text-muted-foreground mt-1">Sprints Planned</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{teams.length}</p><p className="text-xs text-muted-foreground mt-1">Teams</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{members.length}</p><p className="text-xs text-muted-foreground mt-1">Team Members</p></CardContent></Card>
        </div>

        <Separator />

        {/* Sprint Breakdown */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><Calendar className="h-5 w-5" />Sprint Breakdown</h2>
          <div className="space-y-4">
            {sprints.map((sprint) => {
              const sprintTasks = tasks.filter(t => t.sprint_id === sprint.id)
              const doneTasks = sprintTasks.filter(t => t.status === 'done').length
              const progress = sprintTasks.length > 0 ? (doneTasks / sprintTasks.length) * 100 : 0
              const defaults = SPRINT_DEFAULTS[sprint.number]
              const isEditing = editingSprintId === sprint.id

              // Use DB values if they exist, fall back to hardcoded defaults
              const description = sprint.goal ?? defaults?.description ?? ''
              const deliverables = sprint.deliverables?.length ? sprint.deliverables : defaults?.deliverables ?? []
              const keyActivities = sprint.key_activities?.length ? sprint.key_activities : defaults?.keyActivities ?? []

              return (
                <Card key={sprint.id} className="relative group">
                  {isPm && !isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => startEditSprint(sprint)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        {sprint.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{sprint.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">{doneTasks}/{sprintTasks.length} tasks</Badge>
                            <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="mt-3 space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                              <Textarea value={sprintGoalEdit} onChange={e => setSprintGoalEdit(e.target.value)} className="text-sm min-h-[60px]" rows={2} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Key Activities</p>
                              {sprintActivitiesEdit.map((a, i) => (
                                <div key={i} className="flex items-center gap-2 mb-1">
                                  <Input value={a} onChange={e => { const n = [...sprintActivitiesEdit]; n[i] = e.target.value; setSprintActivitiesEdit(n) }} className="text-xs" />
                                  <Button variant="ghost" size="sm" onClick={() => setSprintActivitiesEdit(sprintActivitiesEdit.filter((_, j) => j !== i))} className="h-6 w-6 p-0 shrink-0"><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              ))}
                              <Button variant="ghost" size="sm" onClick={() => setSprintActivitiesEdit([...sprintActivitiesEdit, ''])} className="text-[10px] gap-1 h-6"><Plus className="h-2.5 w-2.5" />Add</Button>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Deliverables</p>
                              {sprintDeliverablesEdit.map((d, i) => (
                                <div key={i} className="flex items-center gap-2 mb-1">
                                  <Input value={d} onChange={e => { const n = [...sprintDeliverablesEdit]; n[i] = e.target.value; setSprintDeliverablesEdit(n) }} className="text-xs" />
                                  <Button variant="ghost" size="sm" onClick={() => setSprintDeliverablesEdit(sprintDeliverablesEdit.filter((_, j) => j !== i))} className="h-6 w-6 p-0 shrink-0"><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              ))}
                              <Button variant="ghost" size="sm" onClick={() => setSprintDeliverablesEdit([...sprintDeliverablesEdit, ''])} className="text-[10px] gap-1 h-6"><Plus className="h-2.5 w-2.5" />Add</Button>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => setEditingSprintId(null)}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
                              <Button size="sm" onClick={saveSprint}><Save className="h-3.5 w-3.5 mr-1" />Save</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
                            {(keyActivities.length > 0 || deliverables.length > 0) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                {keyActivities.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Key Activities</p>
                                    <ul className="space-y-1">
                                      {keyActivities.map((activity, i) => (
                                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><span className="text-primary mt-0.5">-</span>{activity}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {deliverables.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Deliverables</p>
                                    <ul className="space-y-1">
                                      {deliverables.map((d, i) => (
                                        <li key={i} className="text-xs flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-muted-foreground shrink-0" />{d}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Key Metrics */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><BarChart3 className="h-5 w-5" />Key Metrics of Success</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayMetrics.map((group) => (
              <Card key={group.category}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{group.category}</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {group.metrics.map((metric, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground"><TrendingUp className="h-3 w-3 shrink-0 mt-0.5 text-primary" />{metric}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Teams */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><Users className="h-5 w-5" />Teams</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {teams.map((team) => {
              const teamMembers = members.filter(m => m.team_id === team.id)
              const teamTasks = tasks.filter(t => t.team_id === team.id)
              const doneTasks = teamTasks.filter(t => t.status === 'done').length
              return (
                <Card key={team.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{team.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{doneTasks}/{teamTasks.length}</Badge>
                    </div>
                    <div className="space-y-0.5">
                      {teamMembers.map((m) => (
                        <p key={m.id} className="text-xs text-muted-foreground">{m.full_name} {m.role === 'lead' && <span className="text-primary">(Lead)</span>}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
