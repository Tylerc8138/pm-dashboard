/** @purpose Activity timeline + comment thread for task dialog */
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { useActivityLog } from '@/hooks/use-activity-log'
import { useComments, useCreateComment } from '@/hooks/use-comments'
import { useMembers } from '@/hooks/use-members'
import type { ActivityLog, Comment, Member } from '@/types/database'
import { MessageSquare, Send, Activity } from 'lucide-react'

interface TaskActivityProps {
  taskId: string
  currentMemberId: string | null
}

type TimelineEntry =
  | { kind: 'activity'; item: ActivityLog; ts: number }
  | { kind: 'comment'; item: Comment; ts: number }

function getActionLabel(action: string, detail: Record<string, unknown>): string {
  switch (action) {
    case 'created': return 'created this task'
    case 'status_changed': return `changed status from ${detail.from ?? '?'} to ${detail.to ?? '?'}`
    case 'priority_changed': return `changed priority from ${detail.from ?? '?'} to ${detail.to ?? '?'}`
    case 'assigned': return `assigned ${detail.member_name ?? 'someone'}`
    case 'unassigned': return `removed ${detail.member_name ?? 'someone'}`
    case 'dependency_added': return 'added a dependency'
    case 'dependency_removed': return 'removed a dependency'
    case 'blocked': return `marked as blocked${detail.reason ? `: ${detail.reason}` : ''}`
    case 'unblocked': return 'marked as unblocked'
    case 'edited': {
      const fields = detail.fields as string[] | undefined
      return fields?.length ? `edited ${fields.join(', ')}` : 'edited this task'
    }
    case 'comment': return 'left a comment'
    default: return action
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function MemberAvatar({ member }: { member?: Member }) {
  const initials = member?.full_name?.split(' ').map(n => n[0]).join('') ?? '?'
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium shrink-0">
      {initials}
    </div>
  )
}

export function TaskActivity({ taskId, currentMemberId }: TaskActivityProps) {
  const { data: activities = [] } = useActivityLog(taskId)
  const { data: comments = [] } = useComments(taskId)
  const { data: members = [] } = useMembers()
  const createComment = useCreateComment()
  const [commentBody, setCommentBody] = useState('')

  const memberMap = useMemo(() => {
    const m = new Map<string, Member>()
    for (const mem of members) m.set(mem.id, mem)
    return m
  }, [members])

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [
      ...activities
        .filter(a => a.action !== 'comment') // Don't double-show comments
        .map(a => ({ kind: 'activity' as const, item: a, ts: new Date(a.created_at).getTime() })),
      ...comments.map(c => ({ kind: 'comment' as const, item: c, ts: new Date(c.created_at).getTime() })),
    ]
    return entries.sort((a, b) => b.ts - a.ts)
  }, [activities, comments])

  const handleSubmitComment = async () => {
    if (!commentBody.trim() || !currentMemberId) return
    await createComment.mutateAsync({
      task_id: taskId,
      author_id: currentMemberId,
      body: commentBody.trim(),
    })
    setCommentBody('')
  }

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <Label className="flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" />Activity & Comments
        </Label>

        {/* Comment input */}
        <div className="flex gap-2">
          <MemberAvatar member={currentMemberId ? memberMap.get(currentMemberId) : undefined} />
          <div className="flex-1 space-y-2">
            <Textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              style={{ fieldSizing: 'fixed' } as React.CSSProperties}
              className="resize-none min-h-[48px] text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmitComment()
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={!commentBody.trim() || createComment.isPending}
                className="gap-1.5"
              >
                <Send className="h-3 w-3" />
                {createComment.isPending ? 'Sending...' : 'Comment'}
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {timeline.map((entry) => {
              if (entry.kind === 'comment') {
                const c = entry.item as Comment
                const author = memberMap.get(c.author_id)
                return (
                  <div key={`c-${c.id}`} className="flex gap-2">
                    <MemberAvatar member={author} />
                    <div className="flex-1 rounded-md border bg-muted/20 p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{author?.full_name ?? 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                )
              } else {
                const a = entry.item as ActivityLog
                const actor = a.actor_id ? memberMap.get(a.actor_id) : undefined
                return (
                  <div key={`a-${a.id}`} className="flex items-center gap-2 px-1 py-1">
                    <Activity className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{actor?.full_name ?? 'System'}</span>
                      {' '}{getActionLabel(a.action, a.detail as Record<string, unknown>)}
                      <span className="ml-1.5 opacity-60">{timeAgo(a.created_at)}</span>
                    </p>
                  </div>
                )
              }
            })}
          </div>
        )}

        {timeline.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No activity yet.</p>
        )}
      </div>
    </>
  )
}
