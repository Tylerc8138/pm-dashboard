import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSprints } from '@/hooks/use-sprints'
import { useTasks } from '@/hooks/use-tasks'
import { useTeams } from '@/hooks/use-teams'
import { useMembers } from '@/hooks/use-members'
import { Target, Rocket, Calendar, CheckCircle2, TrendingUp, Users, BarChart3 } from 'lucide-react'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const SPRINT_DETAILS: Record<number, { description: string; deliverables: string[]; keyActivities: string[] }> = {
  1: {
    description: 'Rapidly assess where Visa stands today in agentic commerce content. Understand the gaps, audit technical SEO health, and benchmark against Stripe.',
    deliverables: ['Baseline Report', 'Technical + Content SEO Scorecard', 'Directional Competitor Benchmark'],
    keyActivities: [
      'Audit existing content on Visa.com + Developer.visa.com',
      'Run SEO health audit (performance, crawlability, structured data)',
      'Benchmark Visa vs. Stripe across developer channels',
      'Document internal constraints (legal, brand, publishing workflow)',
    ],
  },
  2: {
    description: 'Define who we are building for, where they spend time, and what content we need to produce. Build the strategic foundation before producing anything.',
    deliverables: ['Developer Segmentation Framework', 'Cross-Channel Map', 'Tiered Content Framework + Channel/Owner Matrix'],
    keyActivities: [
      'Define 3-tier developer personas (Intro, Intermediate, Production)',
      'Map where developers + LLMs discover payment content',
      'Build tiered content strategy (Explainers, How-Tos, Technical Recipes)',
      'Assign channels and internal owners to each content type',
    ],
  },
  3: {
    description: 'Test whether AI tools can replace agency-level content production. Document what works, what needs human expertise, and build the case for scaling in-house.',
    deliverables: ['AI Capability Assessment Report'],
    keyActivities: [
      'Test AI content generation for Tier 1 explainer (proof of concept)',
      'Test AI content generation for Tier 2 how-to guide',
      'Document AI capabilities vs. human expertise requirements',
      'Draft internal capability assessment: AI tools vs. agency',
    ],
  },
  4: {
    description: 'Ship real content. Produce 3 pilot assets, route through Legal, publish, and set up the measurement framework to track impact.',
    deliverables: ['3 Launch-Ready Assets', 'Measurement Framework (Draft)'],
    keyActivities: [
      'Produce 1x Discovery/Explainer: "What is Agentic Commerce?"',
      'Produce 1x How To: "Build an AI Payment Agent with Visa CLI"',
      'Produce 1x Technical Code Asset: integration examples + prompt library',
      'Set up LLM citation tracking and baseline metrics',
    ],
  },
  5: {
    description: 'Analyze what worked from the pilot, optimize underperforming content, scale production, and plan the next quarter\'s content roadmap.',
    deliverables: ['Performance Analysis Report', 'Q3 Content Roadmap'],
    keyActivities: [
      'Analyze pilot content performance (organic visibility, engagement)',
      'Optimize content based on SERP and citation data',
      'Scale production on formats that proved effective',
      'Plan next quarter roadmap based on 90-day learnings',
    ],
  },
}

const KEY_METRICS = [
  { category: 'Developer Adoption', metrics: ['Active Visa CLI integrations', 'GitHub stars and MCP registry downloads', 'Developer portal unique visitors', 'Tutorial completion rate'] },
  { category: 'GEO / AEO Performance', metrics: ['LLM citation rate (Visa in AI-generated answers)', 'Featured snippet ownership for target queries', 'Google AI Overview appearances', 'Organic traffic to target GEO pages'] },
  { category: 'Content & Brand', metrics: ['Earned media placements', 'Share of Voice vs. Stripe, PayPal, Adyen', 'Executive thought leadership articles published', 'Developer community mentions (Reddit, HN, Discord)'] },
]

export function OverviewPage() {
  const { data: sprints = [] } = useSprints()
  const { data: tasks = [] } = useTasks()
  const { data: teams = [] } = useTeams()
  const { data: members = [] } = useMembers()

  const overallStats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter(t => t.status === 'done').length
    const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length
    const blocked = tasks.filter(t => t.is_blocked).length
    return { total, done, highPriority, blocked }
  }, [tasks])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-8 p-6 pb-12">

        {/* Hero / North Star */}
        <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/20">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/70 uppercase tracking-wide">North Star</p>
              <h1 className="text-xl font-bold mt-1 leading-snug">
                Get Vibe Coders & Developers to discover, understand, and adopt Visa's Agentic Commerce capabilities
              </h1>
              <p className="mt-3 text-sm text-white/80 leading-relaxed">
                By providing high-velocity, SEO-optimized content, YouTube explainers, and prompt guides over the next 90 days. By the end, Visa will have a data-backed view of discoverability, a validated content strategy, early traction with developers, and the foundational workflows to scale Agentic Commerce content effectively.
              </p>
            </div>
          </div>
        </div>

        {/* What This Plan Enables */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              What This 90-Day Plan Enables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                'Show up consistently across developer-centric channels',
                'Increase visibility in LLM-driven searches when developers explore payment solutions',
                'Launch meaningful pilot assets across YouTube, GitHub/Substack, and Visa properties',
                'Understand the level of internal capacity (with AI tools) versus external investment required to scale',
                'Implement a measurement framework to track performance and inform future decisions',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Overall Progress */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{overallStats.done}/{overallStats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Tasks Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{sprints.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Sprints Planned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{teams.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Teams</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Team Members</p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Sprint Breakdown */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5" />
            Sprint Breakdown
          </h2>

          <div className="space-y-4">
            {sprints.map((sprint) => {
              const sprintTasks = tasks.filter(t => t.sprint_id === sprint.id)
              const doneTasks = sprintTasks.filter(t => t.status === 'done').length
              const progress = sprintTasks.length > 0 ? (doneTasks / sprintTasks.length) * 100 : 0
              const details = SPRINT_DETAILS[sprint.number]

              return (
                <Card key={sprint.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        {sprint.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{sprint.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {doneTasks}/{sprintTasks.length} tasks
                            </Badge>
                            <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </div>

                        {details && (
                          <>
                            <p className="text-sm text-muted-foreground mt-2">{details.description}</p>

                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Key Activities</p>
                                <ul className="space-y-1">
                                  {details.keyActivities.map((activity, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                      <span className="text-primary mt-0.5">-</span>
                                      {activity}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Deliverables</p>
                                <ul className="space-y-1">
                                  {details.deliverables.map((d, i) => (
                                    <li key={i} className="text-xs flex items-center gap-1.5">
                                      <CheckCircle2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                      {d}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </>
                        )}

                        {sprint.goal && !details && (
                          <p className="text-sm text-muted-foreground mt-2">{sprint.goal}</p>
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

        {/* Key Metrics of Success */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5" />
            Key Metrics of Success
          </h2>

          <div className="grid grid-cols-3 gap-4">
            {KEY_METRICS.map((group) => (
              <Card key={group.category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{group.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {group.metrics.map((metric, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                        {metric}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Team Overview */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Users className="h-5 w-5" />
            Teams
          </h2>

          <div className="grid grid-cols-3 gap-3">
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
                        <p key={m.id} className="text-xs text-muted-foreground">
                          {m.full_name} {m.role === 'lead' && <span className="text-primary">(Lead)</span>}
                        </p>
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
