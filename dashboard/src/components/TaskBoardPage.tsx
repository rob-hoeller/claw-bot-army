"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Plus,
  X,
  Clock,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bot,
  Filter,
  CheckSquare,
  GitBranch,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  useTaskBoard,
  statusToColumn,
  type Feature,
  type FeaturePriority,
  type KanbanColumn,
  type ActivityEntry,
} from "@/hooks/useTaskBoard"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const PRIORITY_CONFIG: Record<
  FeaturePriority,
  { label: string; className: string }
> = {
  low: {
    label: "Low",
    className: "bg-white/5 text-white/50 border-white/10",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  high: {
    label: "High",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  critical: {
    label: "Critical",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
}

const COLUMN_CONFIG: Record<
  KanbanColumn,
  { label: string; dotClass: string }
> = {
  backlog: { label: "Backlog", dotClass: "bg-white/30" },
  in_progress: { label: "In Progress", dotClass: "bg-blue-400" },
  review: { label: "Review", dotClass: "bg-amber-400" },
  done: { label: "Done", dotClass: "bg-emerald-400" },
}

const COLUMNS: KanbanColumn[] = ["backlog", "in_progress", "review", "done"]

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  feature,
  onClick,
}: {
  feature: Feature
  onClick: () => void
}) {
  const priority = PRIORITY_CONFIG[feature.priority] ?? PRIORITY_CONFIG.medium

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border bg-white/[0.03] p-3.5 transition-all duration-200",
        "hover:bg-white/[0.06] hover:border-white/15 active:scale-[0.99]",
        feature.needs_attention
          ? "border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.12)]"
          : "border-white/8"
      )}
    >
      {/* Attention indicator */}
      {feature.needs_attention && (
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle className="h-3 w-3 text-orange-400" />
          <span className="text-xs text-orange-400">
            {feature.attention_type ?? "Needs attention"}
          </span>
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-white/90 leading-snug mb-2">
        {feature.title}
      </p>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className={cn("text-[10px] px-1.5 py-0 h-4 border", priority.className)}
        >
          {priority.label}
        </Badge>

        <div className="flex items-center gap-2">
          {feature.current_agent && (
            <span className="flex items-center gap-1 text-[10px] text-white/40">
              <Bot className="h-3 w-3" />
              {feature.current_agent}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-white/30">
            <Clock className="h-3 w-3" />
            {timeAgo(feature.updated_at)}
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

function TaskDetail({
  feature,
  onClose,
}: {
  feature: Feature
  onClose: () => void
}) {
  const priority = PRIORITY_CONFIG[feature.priority] ?? PRIORITY_CONFIG.medium
  const col = COLUMN_CONFIG[statusToColumn(feature.status)]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-white/8">
          <div className="flex-1 min-w-0">
            {feature.needs_attention && (
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-xs text-orange-400">
                  {feature.attention_type ?? "Needs attention"}
                </span>
              </div>
            )}
            <h2 className="text-base font-semibold text-white leading-snug">
              {feature.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-white/40 hover:bg-white/8 hover:text-white/70 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs border", priority.className)}
            >
              {priority.label} priority
            </Badge>
            <Badge
              variant="outline"
              className="text-xs border border-white/10 text-white/50 bg-white/5"
            >
              <span
                className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", col.dotClass)}
              />
              {col.label}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs border border-white/10 text-white/50 bg-white/5"
            >
              {feature.status}
            </Badge>
          </div>

          {/* Description */}
          {feature.description && (
            <p className="text-sm text-white/60 leading-relaxed">
              {feature.description}
            </p>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {feature.current_agent && (
              <div>
                <span className="text-white/30 block mb-0.5">Agent</span>
                <span className="text-white/70 flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  {feature.current_agent}
                </span>
              </div>
            )}
            {feature.assigned_to && (
              <div>
                <span className="text-white/30 block mb-0.5">Assigned to</span>
                <span className="text-white/70">{feature.assigned_to}</span>
              </div>
            )}
            {feature.current_step && (
              <div>
                <span className="text-white/30 block mb-0.5">Step</span>
                <span className="text-white/70">{feature.current_step}</span>
              </div>
            )}
            {feature.revision_count != null && (
              <div>
                <span className="text-white/30 block mb-0.5">Revisions</span>
                <span className="text-white/70">{feature.revision_count}</span>
              </div>
            )}
            <div>
              <span className="text-white/30 block mb-0.5">Created</span>
              <span className="text-white/70">{timeAgo(feature.created_at)}</span>
            </div>
            <div>
              <span className="text-white/30 block mb-0.5">Updated</span>
              <span className="text-white/70">{timeAgo(feature.updated_at)}</span>
            </div>
          </div>

          {/* Branch / PR */}
          {(feature.branch_name || feature.pr_url) && (
            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 space-y-2">
              {feature.branch_name && (
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <GitBranch className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono">{feature.branch_name}</span>
                </div>
              )}
              {feature.pr_url && (
                <a
                  href={feature.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  PR #{feature.pr_number}
                  {feature.pr_status && (
                    <span className="text-white/40">· {feature.pr_status}</span>
                  )}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── New Task Modal ───────────────────────────────────────────────────────────

function NewTaskModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (title: string, description: string, priority: FeaturePriority) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<FeaturePriority>("medium")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setErr(null)
    try {
      await onCreate(title.trim(), description.trim(), priority)
      onClose()
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to create task")
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">New Task</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:bg-white/8 hover:text-white/70 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Title</label>
            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be built?"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">
              Description <span className="text-white/20">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context..."
              rows={3}
              className="w-full rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 px-3 py-2 outline-none focus:border-purple-500/50 resize-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Priority</label>
            <div className="flex gap-2">
              {(["low", "medium", "high", "critical"] as FeaturePriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all",
                    priority === p
                      ? PRIORITY_CONFIG[p].className + " opacity-100"
                      : "border-white/10 text-white/30 bg-transparent hover:border-white/20"
                  )}
                >
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || saving}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Activity Feed Panel ──────────────────────────────────────────────────────

function activityLabel(entry: ActivityEntry): string {
  if (entry.content) return entry.content
  if (entry.action_details) return entry.action_details
  if (entry.action_type) return entry.action_type.replace(/_/g, " ")
  if (entry.event_type) return entry.event_type.replace(/_/g, " ")
  return "activity"
}

function ActivityFeedPanel({
  activity,
  loading,
  agentFilter,
  onAgentFilterChange,
}: {
  activity: ActivityEntry[]
  loading: boolean
  agentFilter: string
  onAgentFilterChange: (v: string) => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  useEffect(() => {
    if (activity.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
    prevLengthRef.current = activity.length
  }, [activity.length])

  const uniqueAgents = Array.from(
    new Set(activity.map((a) => a.agent_id).filter(Boolean))
  ) as string[]

  const filtered = agentFilter
    ? activity.filter((a) => a.agent_id === agentFilter)
    : activity

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-white/80">Live Activity</span>
        </div>
        {uniqueAgents.length > 0 && (
          <select
            value={agentFilter}
            onChange={(e) => onAgentFilterChange(e.target.value)}
            className="text-xs bg-white/5 border border-white/10 text-white/50 rounded-lg px-2 py-1 outline-none focus:border-purple-500/50"
          >
            <option value="">All agents</option>
            {uniqueAgents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Activity className="h-8 w-8 text-white/10" />
            <p className="text-xs text-white/30">No activity yet</p>
          </div>
        ) : (
          [...filtered].reverse().map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
            >
              <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mt-0.5">
                <Bot className="h-3 w-3 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                {entry.agent_id && (
                  <span className="text-[10px] font-medium text-purple-400 block mb-0.5">
                    {entry.agent_id}
                  </span>
                )}
                <p className="text-xs text-white/60 leading-snug line-clamp-2">
                  {activityLabel(entry)}
                </p>
                <span className="text-[10px] text-white/25 mt-0.5 block">
                  {timeAgo(entry.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanCol({
  column,
  features,
  onCardClick,
}: {
  column: KanbanColumn
  features: Feature[]
  onCardClick: (f: Feature) => void
}) {
  const config = COLUMN_CONFIG[column]

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={cn("w-2 h-2 rounded-full shrink-0", config.dotClass)} />
        <span className="text-sm font-medium text-white/70">{config.label}</span>
        <span className="ml-auto text-xs text-white/30 tabular-nums">
          {features.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {features.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/8 p-4 text-center">
            <p className="text-xs text-white/20">No tasks</p>
          </div>
        ) : (
          features.map((f) => (
            <TaskCard key={f.id} feature={f} onClick={() => onCardClick(f)} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BoardSkeleton() {
  return (
    <div className="flex gap-5 overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <div key={col} className="min-w-[260px] w-[260px] shrink-0 space-y-2">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="h-3.5 w-20 rounded bg-white/8" />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5 space-y-2 animate-pulse"
              style={{ opacity: 1 - i * 0.2 }}
            >
              <div className="h-3 w-3/4 rounded bg-white/8" />
              <div className="h-3 w-1/2 rounded bg-white/5" />
              <div className="flex justify-between">
                <div className="h-3 w-12 rounded bg-white/5" />
                <div className="h-3 w-16 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TaskBoardPage() {
  const { features, activity, loading, activityLoading, error, createTask } =
    useTaskBoard()

  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<FeaturePriority | "">("")
  const [agentFilter, setAgentFilter] = useState("")
  const [activityAgentFilter, setActivityAgentFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [showActivity, setShowActivity] = useState(true)

  const handleCreate = useCallback(
    async (title: string, description: string, priority: FeaturePriority) => {
      await createTask(title, description, priority)
    },
    [createTask]
  )

  const filteredFeatures = features.filter((f) => {
    if (priorityFilter && f.priority !== priorityFilter) return false
    if (agentFilter && f.current_agent !== agentFilter) return false
    return true
  })

  const featuresByColumn = COLUMNS.reduce(
    (acc, col) => {
      acc[col] = filteredFeatures.filter((f) => statusToColumn(f.status) === col)
      return acc
    },
    {} as Record<KanbanColumn, Feature[]>
  )

  const uniqueAgents = Array.from(
    new Set(features.map((f) => f.current_agent).filter(Boolean))
  ) as string[]

  const attentionCount = features.filter((f) => f.needs_attention).length

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <CheckSquare className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Task Board</h1>
            <p className="text-xs text-white/40">
              {features.length} task{features.length !== 1 ? "s" : ""}
              {attentionCount > 0 && (
                <span className="ml-2 text-orange-400">
                  · {attentionCount} need{attentionCount !== 1 ? "" : "s"} attention
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
              showFilters || priorityFilter || agentFilter
                ? "border-purple-500/40 text-purple-400 bg-purple-500/10"
                : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {(priorityFilter || agentFilter) && (
              <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[9px] flex items-center justify-center">
                {[priorityFilter, agentFilter].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Activity panel toggle */}
          <button
            onClick={() => setShowActivity(!showActivity)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
              showActivity
                ? "border-purple-500/40 text-purple-400 bg-purple-500/10"
                : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            Activity
          </button>

          <Button
            onClick={() => setShowNewTask(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Task
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border border-white/8 bg-white/[0.02] flex-wrap">
          <span className="text-xs text-white/40">Filter by:</span>
          <div className="flex gap-2 flex-wrap">
            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as FeaturePriority | "")
              }
              className="text-xs bg-white/5 border border-white/10 text-white/60 rounded-lg px-2 py-1 outline-none focus:border-purple-500/50"
            >
              <option value="">All priorities</option>
              {(["low", "medium", "high", "critical"] as FeaturePriority[]).map(
                (p) => (
                  <option key={p} value={p}>
                    {PRIORITY_CONFIG[p].label}
                  </option>
                )
              )}
            </select>
            {uniqueAgents.length > 0 && (
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="text-xs bg-white/5 border border-white/10 text-white/60 rounded-lg px-2 py-1 outline-none focus:border-purple-500/50"
              >
                <option value="">All agents</option>
                {uniqueAgents.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}
          </div>
          {(priorityFilter || agentFilter) && (
            <button
              onClick={() => {
                setPriorityFilter("")
                setAgentFilter("")
              }}
              className="text-xs text-white/30 hover:text-white/60 transition-colors ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Main layout: board + optional activity panel */}
      <div className="flex gap-5 flex-1 min-h-0 overflow-hidden">
        {/* Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          {loading ? (
            <BoardSkeleton />
          ) : (
            <div className="flex gap-5 h-full">
              {COLUMNS.map((col) => (
                <KanbanCol
                  key={col}
                  column={col}
                  features={featuresByColumn[col]}
                  onCardClick={setSelectedFeature}
                />
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        {showActivity && (
          <div className="w-72 shrink-0 rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden flex flex-col">
            <ActivityFeedPanel
              activity={activity}
              loading={activityLoading}
              agentFilter={activityAgentFilter}
              onAgentFilterChange={setActivityAgentFilter}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedFeature && (
        <TaskDetail
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
        />
      )}
      {showNewTask && (
        <NewTaskModal
          onClose={() => setShowNewTask(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
