"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useDroppable } from "@dnd-kit/core"
import {
  Plus,
  Lightbulb,
  PlayCircle,
  Eye,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GitPullRequest,
  Bot,
  Filter,
  Search,
  X,
  ExternalLink,
  MessageSquare,
  Send,
  Link2,
  Calendar,
  User,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Zap,
  Loader2,
  PenTool,
  TestTube2,
  ThumbsUp,
  Rocket,
  Ban,
  FileText,
  Globe,
  DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ErrorBanner } from "@/components/shared/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { useRealtimeFeatures } from "@/hooks/useRealtimeFeatures"
import { ConnectionIndicator } from "./ConnectionIndicator"
import { PipelineActivityFeed } from "./PipelineActivityFeed"
import { PipelineStagePill } from "./PipelineStagePill"
import { RevisionBadge } from "./RevisionBadge"
import { type PipelineLogEntry } from "./PipelineLog"
import { ChatInput } from "@/components/chat/ChatInput"
import type { Attachment } from "@/components/chat/types"
import { AuditTrailTab } from "./audit-trail"
import { StepPanelContent } from "./audit-trail/StepPanelContent"
import type { HandoffPacket } from "./audit-trail/types"
import { useHandoffPackets } from "@/hooks/useHandoffPackets"
import { ClipboardList } from "lucide-react"
import { PhaseChatPanel } from "./audit-trail/PhaseChatPanel"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { LivePipelineView } from "./LivePipelineView"
import type { PipelineStepId } from "./pipeline.types"

// ─── Types ───────────────────────────────────────────────────────
type FeatureStatus =
  | 'planning'
  | 'design_review'
  | 'in_progress'
  | 'qa_review'
  | 'review'
  | 'approved'
  | 'pr_submitted'
  | 'done'
  | 'cancelled'

interface Feature {
  id: string
  title: string
  description: string | null
  status: FeatureStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  requested_by: string | null
  assigned_to: string | null
  approved_by: string | null
  acceptance_criteria: string | null
  labels: string[] | null
  pr_url: string | null
  pr_number: number | null
  pr_status: string | null
  branch_name: string | null
  vercel_preview_url: string | null
  feature_spec: string | null
  design_spec: string | null
  estimated_cost: number | null
  actual_cost: number | null
  cost_notes: string | null
  current_agent: string | null
  revision_count: number
  pipeline_log: PipelineLogEntry[]
  created_at: string
  updated_at: string
}

interface BridgeMessage {
  id: string
  work_item_id: string
  sender_type: 'user' | 'agent' | 'orchestrator'
  sender_id: string
  sender_name: string
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

interface Agent {
  id: string
  name: string
  emoji: string | null
}

// ─── Pipeline Config ─────────────────────────────────────────────
const pipelineStatuses: FeatureStatus[] = [
  'planning',
  'design_review',
  'in_progress',
  'qa_review',
  'review',
  'approved',
  'pr_submitted',
  'done',
]

// Valid transitions: each status can only move to specific next statuses
const validTransitions: Record<FeatureStatus, FeatureStatus[]> = {
  planning: ['design_review', 'cancelled'],
  design_review: ['planning', 'in_progress', 'cancelled'],
  in_progress: ['qa_review', 'design_review', 'cancelled'],
  qa_review: ['in_progress', 'review', 'cancelled'],
  review: ['qa_review', 'approved', 'cancelled'],
  approved: ['pr_submitted', 'review', 'cancelled'],
  pr_submitted: ['done', 'approved', 'cancelled'],
  done: [],
  cancelled: ['planning'],
}

const columns = [
  { id: 'planning' as FeatureStatus, label: 'Plan', icon: Lightbulb, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
  { id: 'design_review' as FeatureStatus, label: 'Design', icon: PenTool, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { id: 'in_progress' as FeatureStatus, label: 'Build', icon: PlayCircle, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  { id: 'qa_review' as FeatureStatus, label: 'Test', icon: TestTube2, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  { id: 'review' as FeatureStatus, label: 'Review', icon: Eye, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { id: 'approved' as FeatureStatus, label: 'Approved', icon: ThumbsUp, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  { id: 'pr_submitted' as FeatureStatus, label: 'PR Submitted', icon: GitPullRequest, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  { id: 'done' as FeatureStatus, label: 'Done', icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/10' },
]

const priorityConfig = {
  low: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Low' },
  medium: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Med' },
  high: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'High' },
  urgent: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: '!!!' },
}

const statusConfig: Record<FeatureStatus, { color: string; label: string }> = {
  planning: { color: 'bg-gray-500/20 text-gray-400', label: 'Planning' },
  design_review: { color: 'bg-blue-500/20 text-blue-400', label: 'Design Review' },
  in_progress: { color: 'bg-yellow-500/20 text-yellow-400', label: 'In Progress' },
  qa_review: { color: 'bg-orange-500/20 text-orange-400', label: 'QA Review' },
  review: { color: 'bg-purple-500/20 text-purple-400', label: 'Review' },
  approved: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Approved' },
  pr_submitted: { color: 'bg-cyan-500/20 text-cyan-400', label: 'PR Submitted' },
  done: { color: 'bg-green-500/20 text-green-400', label: 'Done' },
  cancelled: { color: 'bg-red-500/20 text-red-400', label: 'Cancelled' },
}

// ─── Pipeline Helpers ────────────────────────────────────────────

const STALLED_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

function isStalledPipeline(feature: Feature): boolean {
  if (!feature.current_agent || !feature.pipeline_log || feature.pipeline_log.length === 0) return false
  const lastEntry = feature.pipeline_log[feature.pipeline_log.length - 1]
  if (!lastEntry?.timestamp) return false
  try {
    return Date.now() - new Date(lastEntry.timestamp).getTime() > STALLED_THRESHOLD_MS
  } catch {
    return false
  }
}

// ─── Demo Data ───────────────────────────────────────────────────
const demoAgents: Agent[] = [
  { id: 'HBx', name: 'HBx', emoji: '🧠' },
  { id: 'HBx_IN1', name: 'Product Architect', emoji: '📐' },
  { id: 'HBx_IN2', name: 'Code Factory', emoji: '🏭' },
  { id: 'HBx_IN3', name: 'Research Lab', emoji: '🔬' },
  { id: 'HBx_SP1', name: 'Support', emoji: '🛟' },
  { id: 'HBx_SL1', name: 'Schellie', emoji: '🏠' },
  { id: 'HBx_SL2', name: 'Competitive Intel', emoji: '🔍' },
  { id: 'Lance', name: 'Lance', emoji: '👤' },
]

const demoFeatures: Feature[] = [
  {
    id: '1', title: 'Agent-to-Agent Communication', description: 'Enable HBx to spawn and coordinate with sub-agents',
    status: 'in_progress', priority: 'high', requested_by: 'HBx', assigned_to: 'HBx_IN2', approved_by: 'Lance',
    acceptance_criteria: '- HBx can spawn sub-agents\n- Tasks route correctly', labels: ['core', 'infrastructure'],
    pr_url: null, pr_number: null, pr_status: null, branch_name: 'hbx/agent-communication',
    vercel_preview_url: null, feature_spec: null, design_spec: null,
    estimated_cost: 25, actual_cost: null, cost_notes: null,
    current_agent: 'IN2', revision_count: 0, pipeline_log: [],
    created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '2', title: 'Learning Log Dashboard', description: 'UI to display agent learning activities',
    status: 'planning', priority: 'medium', requested_by: 'HBx_IN3', assigned_to: null, approved_by: null,
    acceptance_criteria: null, labels: ['ui', 'innovation'],
    pr_url: null, pr_number: null, pr_status: null, branch_name: null,
    vercel_preview_url: null, feature_spec: null, design_spec: null,
    estimated_cost: 10, actual_cost: null, cost_notes: null,
    current_agent: null, revision_count: 0, pipeline_log: [],
    created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date().toISOString(),
  },
]

// ─── Pipeline Progress Bar ───────────────────────────────────────
function PipelineProgress({
  status,
  selectedPhase,
  onPhaseClick,
}: {
  status: FeatureStatus
  selectedPhase?: string | null
  onPhaseClick?: (phase: string) => void
}) {
  if (status === 'cancelled') return null
  const currentIndex = pipelineStatuses.indexOf(status)
  const total = pipelineStatuses.length
  const interactive = !!onPhaseClick

  return (
    <div className="relative">
      <div className="flex items-center gap-0.5">
        {pipelineStatuses.map((s, i) => {
          const col = columns.find(c => c.id === s)
          const isComplete = i < currentIndex
          const isCurrent = i === currentIndex
          const isClickable = interactive && (isComplete || isCurrent)
          const isSelected = selectedPhase === s

          return (
            <div
              key={s}
              title={col?.label || s}
              onClick={isClickable ? (e) => { e.stopPropagation(); onPhaseClick!(s) } : undefined}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                isComplete ? "bg-green-400/60" :
                isCurrent && s === 'done' ? "bg-green-400/80" :
                isCurrent ? "bg-purple-400/80" :
                "bg-white/10",
                isClickable && "cursor-pointer hover:brightness-125",
                isSelected && "ring-1 ring-white/40 brightness-150",
              )}
            />
          )
        })}
        <span className="text-[9px] text-white/30 ml-1">{currentIndex + 1}/{total}</span>
      </div>
      {/* Selected phase indicator caret */}
      {interactive && selectedPhase && (() => {
        const idx = pipelineStatuses.indexOf(selectedPhase as FeatureStatus)
        if (idx < 0) return null
        // Position caret below the selected segment
        const pct = ((idx + 0.5) / total) * 100
        return (
          <div className="relative w-full h-1.5" style={{ marginTop: '2px' }}>
            <div
              className="absolute w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-purple-400/80 -translate-x-1/2"
              style={{ left: `${pct}%` }}
            />
          </div>
        )
      })()}
    </div>
  )
}

// ─── Status Dropdown (Pipeline-Restricted) ───────────────────────
function StatusDropdown({
  currentStatus,
  onStatusChange,
  disabled = false,
}: {
  currentStatus: FeatureStatus
  onStatusChange: (status: FeatureStatus) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const current = statusConfig[currentStatus]
  const allowedTransitions = validTransitions[currentStatus] || []

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (disabled) return
          setOpen(!open)
        }}
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-all hover:ring-1 hover:ring-white/20",
          current.color,
          disabled && "opacity-60 cursor-not-allowed hover:ring-0"
        )}
        disabled={disabled}
      >
        {current.label}
        <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute top-full left-0 mt-1 z-40 bg-black/95 border border-white/10 rounded-md py-1 min-w-[150px] shadow-xl">
            {/* Show next valid transitions */}
            {allowedTransitions.length > 0 ? (
              <>
                <div className="px-2 py-0.5 text-[9px] text-white/30 uppercase tracking-wider">Move to</div>
                {allowedTransitions.map((targetStatus) => {
                  const col = columns.find(c => c.id === targetStatus)
                  const conf = statusConfig[targetStatus]
                  const Icon = col?.icon || ChevronRight
                  return (
                    <button
                      key={targetStatus}
                      onClick={(e) => {
                        e.stopPropagation()
                        onStatusChange(targetStatus)
                        setOpen(false)
                      }}
                      className="w-full text-left px-2 py-1 text-[11px] hover:bg-white/10 flex items-center gap-2"
                    >
                      <Icon className={cn("h-3 w-3", col?.color || 'text-white/40')} />
                      <span className="text-white/80">{conf.label}</span>
                      {targetStatus === 'cancelled' && <Ban className="h-2.5 w-2.5 text-red-400/50 ml-auto" />}
                    </button>
                  )
                })}
              </>
            ) : (
              <div className="px-2 py-1 text-[10px] text-white/30">No transitions available</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sortable Feature Card ──────────────────────────────────────
function SortableFeatureCard({
  feature,
  agents,
  onClick,
  onStatusChange,
  isUpdating,
  isJustMoved,
}: {
  feature: Feature
  agents: Agent[]
  onClick: () => void
  onStatusChange: (status: FeatureStatus) => void
  isUpdating: boolean
  isJustMoved?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: feature.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      layoutId={feature.id}
      layout
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn("relative", isJustMoved && "animate-card-glow")}
    >
      <div
        onClick={onClick}
        className={cn(
          "p-2 rounded-md bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer group",
          isUpdating && "opacity-70",
          (feature.revision_count || 0) >= 2 && "border-l-4 border-l-red-500"
        )}
      >
        {isUpdating && (
          <div className="absolute top-1 right-1 flex items-center gap-1 text-[9px] text-white/60">
            <Loader2 className="h-3 w-3 animate-spin text-purple-300" />
          </div>
        )}
        <div className="mb-1" {...listeners}>
          <h4 className="text-xs font-medium text-white/90 leading-tight line-clamp-2 group-hover:text-purple-300 transition-colors cursor-grab active:cursor-grabbing">
            {feature.title}
          </h4>
        </div>

        {/* Pipeline progress mini */}
        <div className="mb-1">
          <PipelineProgress status={feature.status} />
        </div>

        {/* Pipeline stage pill + revision badge */}
        {(feature.current_agent || feature.status === ('escalated' as FeatureStatus)) && (
          <div className="flex items-center gap-1.5 mb-1">
            <PipelineStagePill
              agent={feature.current_agent}
              status={feature.status}
              isStalled={isStalledPipeline(feature)}
            />
            <RevisionBadge count={feature.revision_count || 0} />
          </div>
        )}

        {/* Cost badges */}
        {(feature.estimated_cost != null || feature.actual_cost != null) && (
          <div className="flex items-center gap-1 mb-1">
            {feature.estimated_cost != null && (
              <span className="text-[9px] text-white/40 bg-white/5 px-1 rounded" title="Estimated cost">
                ~${feature.estimated_cost.toFixed(2)}
              </span>
            )}
            {feature.actual_cost != null && (
              <span className="text-[9px] text-green-400/70 bg-green-500/10 px-1 rounded" title="Actual cost">
                ${feature.actual_cost.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Plain Card (for drag overlay) ──────────────────────────────
function FeatureCardPlain({ feature }: { feature: Feature }) {
  return (
    <div className="p-2 rounded-md bg-white/[0.06] border border-purple-400/40 shadow-lg shadow-purple-500/10 w-[200px]">
      <h4 className="text-xs font-medium text-white/90 leading-tight line-clamp-2">{feature.title}</h4>
    </div>
  )
}

// ─── Create Feature Panel (Planning Chat) ────────────────────────
function CreateFeaturePanel({
  agents,
  onClose,
  onCreated,
  isDemoMode,
}: {
  agents: Agent[]
  onClose: () => void
  onCreated: (feature: Feature) => void
  isDemoMode: boolean
}) {
  // Form state removed (chat-only flow)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ type: 'error' | 'info'; message: string } | null>(null)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: "👋 I'm **IN1** — your Product Architect. Let's plan this feature together.\n\nWhat problem are you looking to solve?" },
  ])
  const [chatting, setChatting] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  // chat-only mode
  const chatEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, streamingContent])

  const assistantMessageCount = chatMessages.filter(m => m.role === 'assistant').length

  const handleChatSend = async (content: string, attachments: Attachment[]) => {
    if (!content.trim() || chatting || isStreaming) return
    const msg = content.trim()
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: msg }]
    setChatMessages(updatedMessages)
    setChatting(true)

    try {
      abortControllerRef.current = new AbortController()
      const res = await fetch('/api/features/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, attachments }),
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok || !res.body) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: "I'm having trouble connecting. Please try again in a moment.",
        }])
        return
      }

      // Stream SSE response
      setIsStreaming(true)
      setStreamingContent("")
      const reader = res.body.getReader()
      const { parseSSEStream } = await import("@/lib/sse-utils")

      await parseSSEStream(
        reader,
        (fullContent) => setStreamingContent(fullContent),
        (fullContent) => {
          setIsStreaming(false)
          setStreamingContent("")
          if (fullContent) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: fullContent }])
          }
        }
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
      }])
      setIsStreaming(false)
      setStreamingContent("")
    } finally {
      setChatting(false)
      abortControllerRef.current = null
    }
  }

  const { userId: currentUserId, userName: currentUserName } = useCurrentUser()
  const requestedBy = currentUserId ?? (agents.find(a => a.id === 'HBx')?.id ?? agents[0]?.id ?? null)

  const [savingPhase, setSavingPhase] = useState<'idle' | 'generating' | 'creating'>('idle')

  const handleCreateFromChat = async () => {
    if (!currentUserId) {
      setNotice({ type: 'info', message: "Please select your identity in the top-right corner before creating a feature." })
      return
    }
    if (saving) return
    setSaving(true)
    setSavingPhase('generating')
    setNotice(null)

    // Format chat transcript as markdown
    const transcript = chatMessages
      .map(m => m.role === 'user' ? `**User:** ${m.content}` : `**IN1:** ${m.content}`)
      .join('\n\n')

    // Smart title generation via API
    let extractedTitle = ''
    try {
      const titleRes = await fetch('/api/features/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages }),
      })
      if (titleRes.ok) {
        const titleData = await titleRes.json()
        if (titleData.title) extractedTitle = titleData.title
      }
    } catch {
      // Fall back to extraction below
    }

    // Fallback: extract from last assistant message or first user message
    if (!extractedTitle) {
      const lastAssistant = [...chatMessages].reverse().find(m => m.role === 'assistant')
      if (lastAssistant) {
        const headingMatch = lastAssistant.content.match(/^#\s+(.+)$/m)
        const titleMatch = lastAssistant.content.match(/\*\*Title:\*\*\s*(.+)/i)
        extractedTitle = headingMatch?.[1] || titleMatch?.[1] || ''
      }
      if (!extractedTitle) {
        const firstUser = chatMessages.find(m => m.role === 'user')
        extractedTitle = firstUser ? firstUser.content.slice(0, 80) : 'Untitled Feature'
      }
    }

    setSavingPhase('creating')

    // requestedBy resolved above

    const newFeature = {
      title: extractedTitle.trim(),
      description: null,
      priority: 'medium' as const,
      status: 'planning' as const,
      assigned_to: 'HBx_IN1',
      requested_by: requestedBy,
      labels: null,
      feature_spec: transcript,
    }

    if (isDemoMode) {
      onCreated({
        ...newFeature,
        id: crypto.randomUUID(),
        approved_by: null,
        acceptance_criteria: null,
        pr_url: null,
        pr_number: null,
        pr_status: null,
        branch_name: null,
        vercel_preview_url: null,
        design_spec: null,
        estimated_cost: null,
        actual_cost: null,
        cost_notes: null,
        current_agent: null,
        revision_count: 0,
        pipeline_log: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      onClose()
      setSaving(false)
      return
    }

    // Retry logic: 1 retry after 2s on transient failure
    const attemptCreate = async (attempt: number): Promise<boolean> => {
      try {
        const res = await fetch('/api/features', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newFeature),
        })
        const payload = await res.json()
        if (!res.ok) {
          throw new Error(payload?.error || 'Failed to create')
        }
        onCreated(payload.feature)
        onClose()
        return true
      } catch (err) {
        if (attempt < 1) {
          await new Promise(r => setTimeout(r, 2000))
          return attemptCreate(attempt + 1)
        }
        const msg = err instanceof Error ? err.message : "Unknown error"
        setNotice({ type: 'error', message: `Couldn't create feature: ${msg}` })
        return false
      }
    }
    await attemptCreate(0)
    setSaving(false)
    setSavingPhase('idle')
  }

  // handleCreate removed (chat-only flow)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed top-0 right-0 h-full w-full max-w-md bg-black/98 border-l border-white/10 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">New Feature</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7"><X className="h-4 w-4" /></Button>
        </div>
        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-1 text-[10px] text-purple-300">
          <MessageSquare className="h-3 w-3" />Planning Chat
        </div>
      </div>

      {notice && (
        <div
          className={cn(
            "mx-3 mt-2 rounded border px-2 py-1 text-[10px]",
            notice.type === 'error'
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
          )}
        >
          {notice.message}
        </div>
      )}

      <>
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3" role="log" aria-live="polite">
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                <span className="text-sm flex-shrink-0 mt-0.5">{msg.role === 'user' ? '👤' : '🏗️'}</span>
                <div className={cn(
                  "max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] text-white/70 whitespace-pre-wrap",
                  msg.role === 'user' ? "bg-blue-600/20 border border-blue-500/20" : "bg-white/[0.04] border border-white/10"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isStreaming && streamingContent && (
              <div className="flex gap-2">
                <span className="text-sm flex-shrink-0 mt-0.5">🏗️</span>
                <div className="max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] text-white/70 whitespace-pre-wrap bg-white/[0.04] border border-white/10">
                  {streamingContent}
                  <span className="inline-block w-1.5 h-3 bg-purple-400/60 animate-pulse ml-0.5" />
                </div>
              </div>
            )}
            {chatting && !isStreaming && (
              <div className="flex gap-2">
                <span className="text-sm">🏗️</span>
                <div className="rounded-lg px-2.5 py-1.5 bg-white/[0.04] border border-white/10">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {/* Create from chat button */}
          {assistantMessageCount >= 2 && (
            <div className="flex-shrink-0 px-3 py-2 border-t border-white/5">
              <Button
                onClick={handleCreateFromChat}
                className="w-full h-8 text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                disabled={saving || chatting || isStreaming}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Zap className="h-3 w-3 mr-1.5" />}
                {savingPhase === 'generating' ? 'Generating title...' : savingPhase === 'creating' ? 'Creating...' : 'Create Feature from Chat'}
              </Button>
            </div>
          )}
          {/* Chat input */}
          <ChatInput
            onSend={handleChatSend}
            disabled={chatting || isStreaming}
            placeholder="Describe your feature idea..."
          />
      </>
    </motion.div>
  )
}

// ─── Sender Config ───────────────────────────────────────────────
const senderConfig = {
  user: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', emoji: '👤', align: 'right' as const },
  agent: { color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', emoji: '🤖', align: 'left' as const },
  orchestrator: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', emoji: '🧠', align: 'left' as const },
}

// ─── Bridge Chat Message ─────────────────────────────────────────
function BridgeChatMessage({ msg, agents }: { msg: BridgeMessage; agents: Agent[] }) {
  const config = senderConfig[msg.sender_type] || senderConfig.agent
  const agent = agents.find(a => a.id === msg.sender_id)
  const emoji = agent?.emoji || config.emoji
  const isUser = msg.sender_type === 'user'

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <span className="text-sm flex-shrink-0 mt-0.5">{emoji}</span>
      <div className={cn(
        "max-w-[80%] rounded-lg px-2.5 py-1.5",
        isUser ? "bg-blue-600/20 border border-blue-500/20" :
        msg.sender_type === 'orchestrator' ? "bg-yellow-500/10 border border-yellow-500/15" :
        "bg-white/[0.04] border border-white/10"
      )}>
        <div className={cn("flex items-baseline gap-2 mb-0.5", isUser && "flex-row-reverse")}>
          <span className="text-[10px] font-medium text-white/70">{msg.sender_name}</span>
          <Badge className={cn("text-[8px] px-1 py-0 h-3.5 border", config.color)}>{msg.sender_type}</Badge>
          <span className="text-[9px] text-white/25">{new Date(msg.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className={cn("text-[11px] text-white/70 whitespace-pre-wrap", isUser && "text-right")}>{msg.content}</p>
      </div>
    </div>
  )
}

// ─── Approve Button ──────────────────────────────────────────────
function ApproveButton({
  feature,
  targetStatus,
  label,
  onApprove,
  onError,
}: {
  feature: Feature
  targetStatus: FeatureStatus
  label: string
  onApprove: (status: FeatureStatus) => void
  onError: (message: string) => void
}) {
  const { userId: currentUserId } = useCurrentUser()
  const [loading, setLoading] = useState(false)
  const [creatingPR, setCreatingPR] = useState(false)
  const allowed = validTransitions[feature.status]?.includes(targetStatus)
  if (!allowed) return null

  // Clear "Creating PR..." when feature moves past approved (realtime push)
  const prevStatusRef = useRef(feature.status)
  useEffect(() => {
    if (creatingPR && feature.status !== prevStatusRef.current) {
      setCreatingPR(false)
    }
    prevStatusRef.current = feature.status
  }, [feature.status, creatingPR])

  return (
    <Button
      size="sm"
      onClick={async (e) => {
        e.stopPropagation()
        setLoading(true)
        try {
          const res = await fetch(`/api/features/${feature.id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_status: targetStatus, approved_by: currentUserId ?? 'unknown' }),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => null)
            onError(body?.error ?? "Update failed. Try again.")
            return
          }
          onApprove(targetStatus)
          // If approving from review → approved, show PR creation state
          if (feature.status === 'review' && targetStatus === 'approved') {
            setCreatingPR(true)
          }
        } catch {
          onError("Update failed. Check connection and try again.")
        } finally {
          setLoading(false)
        }
      }}
      disabled={loading || creatingPR}
      className={cn(
        "h-7 text-[10px] gap-1",
        creatingPR
          ? "bg-cyan-600/30 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30"
          : "bg-emerald-600/80 hover:bg-emerald-500 text-white"
      )}
    >
      {creatingPR ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Creating PR...
        </>
      ) : loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <ThumbsUp className="h-3 w-3" />
      )}
      {!creatingPR && label}
    </Button>
  )
}

// ─── Feature Detail Panel ────────────────────────────────────────
function FeatureDetailPanel({
  feature,
  agents,
  onClose,
  onStatusChange,
  onReassign,
  onError,
}: {
  feature: Feature
  agents: Agent[]
  onClose: () => void
  onStatusChange: (status: FeatureStatus) => void
  onReassign: (agentId: string | null) => void
  onError: (message: string) => void
}) {
  const [messages, setMessages] = useState<BridgeMessage[]>([])
  const { userId: currentUserId, userName: currentUserName } = useCurrentUser()
  const [newMessage, setNewMessage] = useState("")
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [sending, setSending] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details')
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)
  const [showReassign, setShowReassign] = useState(false)
  const [startingPipeline, setStartingPipeline] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState<PipelineStepId | undefined>(undefined)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { packets: handoffPackets, loading: handoffLoading } = useHandoffPackets(feature.id, activeTab === 'audit' || selectedPhase !== null)

  // Get the selected phase's packet for the progress bar click view
  const selectedPhasePacket: HandoffPacket | null = (() => {
    if (!selectedPhase || !handoffPackets) return null
    const phasePackets = handoffPackets.filter(p => p.phase === selectedPhase)
    if (phasePackets.length === 0) return null
    return phasePackets.reduce((a, b) => (a.version > b.version ? a : b))
  })()

  const handlePhaseClick = (phase: string) => {
    if (selectedPhase === phase) {
      setSelectedPhase(null) // toggle off
    } else {
      setSelectedPhase(phase)
    }
  }

  const handleTabClick = (tab: 'details' | 'audit') => {
    setActiveTab(tab)
    setSelectedPhase(null) // deselect progress bar on tab click
  }

  const isUpdating = false
  const priority = priorityConfig[feature.priority]
  const assignedAgent = agents.find(a => a.id === feature.assigned_to)
  const requestedAgent = agents.find(a => a.id === feature.requested_by)

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    async function loadMessages() {
      try {
        const res = await fetch(`/api/work-items/${feature.id}/messages`)
        if (!res.ok) throw new Error('Failed')
        setMessages(await res.json())
      } catch { setMessages([]) }
      finally { setLoadingMessages(false) }
    }
    loadMessages()
  }, [feature.id])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase.channel(`bridge-${feature.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'work_item_messages', filter: `work_item_id=eq.${feature.id}` },
        (payload) => {
          const newMsg = payload.new as BridgeMessage
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        })
      .subscribe()
    return () => { supabase!.removeChannel(channel) }
  }, [feature.id])

  // Bridge chat scrolling removed — chat is now embedded in phase views

  const buildHistory = useCallback(() =>
    messages.filter(m => m.sender_type === 'user' || m.sender_type === 'agent')
      .map(m => ({ role: m.sender_type === 'user' ? 'user' : 'assistant', content: m.content })),
    [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return
    const content = newMessage.trim()
    setNewMessage("")
    setSending(true)

    const optimistic: BridgeMessage = {
      id: `opt-${Date.now()}`, work_item_id: feature.id, sender_type: 'user', sender_id: currentUserId ?? 'unknown',
      sender_name: currentUserName ?? 'Unknown', content, metadata: {}, created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const isFirst = messages.length === 0
      const contextPrefix = isFirst
        ? `[Feature: "${feature.title}"${feature.description ? ` — ${feature.description}` : ''}]\n\n`
        : ''
      const messageContent = contextPrefix + content

      const saveRes = await fetch(`/api/work-items/${feature.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_type: 'user', sender_id: currentUserId ?? 'unknown', sender_name: currentUserName ?? 'Unknown', content: messageContent }),
      })
      if (saveRes.ok) {
        const saved = await saveRes.json()
        setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m))
      }

      setIsStreaming(true)
      setStreamingContent("")
      const history = buildHistory()
      const streamRes = await fetch(`/api/work-items/${feature.id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageContent, history }),
      })
      if (!streamRes.ok || !streamRes.body) throw new Error('Stream failed')

      const reader = streamRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ""
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              const c = parsed.choices?.[0]?.delta?.content || ''
              if (c) { fullContent += c; setStreamingContent(fullContent) }
            } catch { /* skip */ }
          }
        }
      }

      setIsStreaming(false)
      setStreamingContent("")
      if (!fullContent) fullContent = 'No response generated.'

      const agentName = assignedAgent?.name || feature.assigned_to || 'Agent'
      await fetch(`/api/work-items/${feature.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_type: 'agent', sender_id: feature.assigned_to || 'unknown', sender_name: agentName, content: fullContent, metadata: { streamed: true } }),
      })
    } catch (err) {
      console.error('Chat error:', err)
      setIsStreaming(false); setStreamingContent("")
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setNewMessage(content)
    } finally { setSending(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="fixed top-0 right-0 h-full w-full max-w-md bg-black/98 border-l border-white/10 z-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Badge className={cn("text-[9px] px-1 py-0 h-4 border", priority.color)}>{priority.label}</Badge>
              <StatusDropdown currentStatus={feature.status} onStatusChange={onStatusChange} />
            </div>
            <h2 className="text-sm font-semibold text-white leading-tight">{feature.title}</h2>
            {/* Pipeline Progress — clickable */}
            <div className="mt-1.5">
              <PipelineProgress
                status={feature.status}
                selectedPhase={selectedPhase}
                onPhaseClick={handlePhaseClick}
              />
            </div>
            {assignedAgent && (
              <div className="flex items-center gap-1 mt-1">
                <Zap className="h-2.5 w-2.5 text-purple-400" />
                <span className="text-[10px] text-purple-400">Live Bridge → {assignedAgent.emoji} {assignedAgent.name}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 flex-shrink-0"><X className="h-4 w-4" /></Button>
        </div>

        {/* Approve actions */}
        {(feature.status === 'design_review' || feature.status === 'qa_review' || feature.status === 'review') && (
          <div className="flex gap-1.5 mt-2">
            {feature.status === 'design_review' && (
              <ApproveButton feature={feature} targetStatus="in_progress" label="Approve Design → Build" onApprove={onStatusChange} onError={onError} />
            )}
            {feature.status === 'qa_review' && (
              <ApproveButton feature={feature} targetStatus="review" label="QA Pass → Review" onApprove={onStatusChange} onError={onError} />
            )}
            {feature.status === 'review' && (
              <ApproveButton feature={feature} targetStatus="approved" label="Approve" onApprove={onStatusChange} onError={onError} />
            )}
          </div>
        )}

        {/* Preview link only shown inside Review tab (StepPanelContent) */}

        {/* Tabs — only Details and Audit Trail */}
        <div className="flex gap-1 mt-2">
          <button onClick={() => handleTabClick('details')} className={cn("px-2 py-1 text-[10px] rounded transition-all", activeTab === 'details' && !selectedPhase ? "bg-white/10 text-white/80" : "text-white/40 hover:text-white/60")}>Details</button>
          <button onClick={() => handleTabClick('audit')} className={cn("px-2 py-1 text-[10px] rounded transition-all", activeTab === 'audit' && !selectedPhase ? "bg-emerald-500/20 text-emerald-300" : "text-white/40 hover:text-white/60")}>
            <ClipboardList className="h-3 w-3 inline mr-1" />Audit Trail
          </button>
          {selectedPhase && (
            <span className="px-2 py-1 text-[10px] rounded bg-purple-500/20 text-purple-300 ml-auto">
              {columns.find(c => c.id === selectedPhase)?.label || selectedPhase}
              <button onClick={() => setSelectedPhase(null)} className="ml-1 text-white/40 hover:text-white/60">✕</button>
            </span>
          )}
        </div>
      </div>

      {/* Live Pipeline View - Always visible */}
      <div className="flex-shrink-0 px-3 pb-3 border-b border-white/10 bg-gradient-to-b from-black/0 to-black/20">
        <LivePipelineView
          feature={feature}
          isLoading={false}
          selectedStepId={selectedStepId}
          onStepClick={(stepId) => setSelectedStepId(stepId === selectedStepId ? undefined : stepId)}
        />
      </div>

      {/* Tab Content — phase click overrides tab */}
      {selectedPhase ? (
        <div className="flex-1 overflow-y-auto p-3">
          {handoffLoading ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
              <span className="text-[10px] text-white/30 ml-2">Loading phase data...</span>
            </div>
          ) : (
            <StepPanelContent
              packet={selectedPhasePacket}
              phasePackets={handoffPackets?.filter(p => p.phase === selectedPhase).sort((a, b) => a.version - b.version)}
              phase={selectedPhase}
              featureSpec={feature.feature_spec}
              designSpec={feature.design_spec}
              acceptanceCriteria={feature.acceptance_criteria}
              prUrl={feature.pr_url}
              prNumber={feature.pr_number}
              prStatus={feature.pr_status}
              vercelPreviewUrl={feature.vercel_preview_url}
              featureId={feature.id}
              agents={agents}
              approvedBy={feature.approved_by}
            />
          )}
        </div>
      ) : activeTab === 'details' ? (
        <div className="flex-1 overflow-y-auto">
          {/* ── Section 1: Overview ── */}
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3 w-3" />Overview
            </div>
            {feature.description && (
              <p className="text-xs text-white/70 leading-relaxed">{feature.description}</p>
            )}
            {!feature.description && (
              <p className="text-[11px] text-white/30 italic">No description provided</p>
            )}
            {feature.labels && feature.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {feature.labels.map((label) => (<span key={label} className="px-1.5 py-0.5 text-[9px] rounded bg-white/5 text-white/50">{label}</span>))}
              </div>
            )}
          </div>

          {/* ── Section 2: Progress & Assignment ── */}
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowRight className="h-3 w-3" />Progress
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-white/30" /><span className="text-white/50">Requested:</span>
                <span className="text-white/80">{
                  agents.find(a => a.id === feature.requested_by)?.name || feature.requested_by || '—'
                }</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-white/30" /><span className="text-white/50">Created:</span>
                <span className="text-white/80">{new Date(feature.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
              </div>
            </div>
            {/* Current phase indicator */}
            {feature.current_agent && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-purple-500/5 border border-purple-500/10">
                <Zap className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] text-purple-300">Currently with <strong>{feature.current_agent}</strong></span>
                {feature.revision_count > 0 && (
                  <span className="text-[9px] bg-orange-500/10 text-orange-300 px-1.5 py-0.5 rounded ml-auto">
                    {feature.revision_count} revision{feature.revision_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {feature.status === 'planning' && (
              <button
                onClick={async () => {
                  if (startingPipeline) return
                  setStartingPipeline(true)
                  try {
                    const res = await fetch(`/api/features/${feature.id}/start-pipeline`, { method: 'POST' })
                    if (!res.ok) {
                      const body = await res.json().catch(() => null)
                      console.error('Start pipeline failed:', body?.error)
                    }
                  } catch {
                    // handled by realtime update
                  } finally {
                    setStartingPipeline(false)
                  }
                }}
                disabled={startingPipeline || isUpdating}
                className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-medium rounded-md bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-colors disabled:opacity-50"
              >
                {startingPipeline
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Starting Pipeline...</>
                  : <><Rocket className="h-3.5 w-3.5" />Start Pipeline</>}
              </button>
            )}
          </div>

          {/* ── Section 3: Specification ── */}
          {(feature.acceptance_criteria || feature.feature_spec) && (
            <div className="p-3 border-b border-white/5 space-y-2">
              <div className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList className="h-3 w-3" />Specification
              </div>
              {feature.acceptance_criteria && (
                <div>
                  <div className="text-[9px] text-white/30 mb-1">Acceptance Criteria</div>
                  <pre className="text-[10px] text-white/60 whitespace-pre-wrap font-mono bg-white/[0.02] rounded p-2 border border-white/5 max-h-32 overflow-y-auto">
                    {feature.acceptance_criteria}
                  </pre>
                </div>
              )}
              {feature.feature_spec && (
                <div>
                  <div className="text-[9px] text-white/30 mb-1">Feature Spec</div>
                  <pre className="text-[10px] text-white/60 whitespace-pre-wrap font-mono bg-white/[0.02] rounded p-2 border border-white/5 max-h-40 overflow-y-auto">
                    {feature.feature_spec.length > 500 ? feature.feature_spec.slice(0, 500) + '…' : feature.feature_spec}
                  </pre>
                </div>
              )}
              {feature.design_spec && (
                <div>
                  <div className="text-[9px] text-white/30 mb-1">Design Spec</div>
                  <pre className="text-[10px] text-white/60 whitespace-pre-wrap font-mono bg-white/[0.02] rounded p-2 border border-white/5 max-h-40 overflow-y-auto">
                    {feature.design_spec.length > 500 ? feature.design_spec.slice(0, 500) + '…' : feature.design_spec}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ── Section 4: Technical / Cost ── */}
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" />Technical & Cost
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-white/30">Estimated Cost</label>
                <div className="text-[11px] text-white/70">
                  {feature.estimated_cost != null ? `$${feature.estimated_cost.toFixed(2)}` : '—'}
                </div>
              </div>
              <div>
                <label className="text-[9px] text-white/30">Actual Cost</label>
                <div className="text-[11px] text-white/70">
                  {feature.actual_cost != null ? `$${feature.actual_cost.toFixed(2)}` : '—'}
                </div>
              </div>
            </div>
            {feature.cost_notes && (
              <div>
                <label className="text-[9px] text-white/30">Notes</label>
                <p className="text-[10px] text-white/50 italic">{feature.cost_notes}</p>
              </div>
            )}
          </div>

          {/* ── Section 5: Context & Links ── */}
          <div className="p-3 border-b border-white/5 space-y-1.5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Link2 className="h-3 w-3" />Context & Links
            </div>
            {feature.vercel_preview_url ? (
              <a href={feature.vercel_preview_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-[11px] text-cyan-400 hover:text-cyan-300">
                <Globe className="h-3 w-3" /><span>Vercel Preview</span><ExternalLink className="h-2.5 w-2.5" />
              </a>
            ) : feature.status === 'review' ? (
              <span className="flex items-center gap-2 text-[11px] text-white/40">
                <Globe className="h-3 w-3" />⏳ Preview link pending...
              </span>
            ) : null}
            {feature.branch_name && (
              <div className="flex items-center gap-2 text-[11px]">
                <Link2 className="h-3 w-3 text-white/30" /><span className="text-white/50">Branch:</span>
                <code className="text-purple-400 bg-purple-400/10 px-1 rounded text-[10px]">{feature.branch_name}</code>
              </div>
            )}
            {feature.pr_url && (
              <a href={feature.pr_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] text-purple-400 hover:text-purple-300">
                <GitPullRequest className="h-3 w-3" /><span>PR #{feature.pr_number}</span>
                <Badge className={cn("text-[9px] px-1 py-0 h-4", feature.pr_status === 'merged' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400')}>{feature.pr_status}</Badge>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {!feature.branch_name && !feature.pr_url && !feature.vercel_preview_url && <p className="text-[11px] text-white/30">No links yet</p>}
          </div>

          {/* Escalation Banner */}
          {(feature.revision_count || 0) >= 2 && (
            <div className="mx-3 mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
              <p className="text-[11px] text-red-300 flex items-center gap-1.5">
                ⚠️ This feature has been escalated after 2 revision loops. Awaiting Lance&apos;s review.
              </p>
            </div>
          )}

          {/* ── Section 6: Actions ── */}
          {feature.status !== 'cancelled' && feature.status !== 'done' && (
            <div className="p-3 border-b border-white/5">
              <button onClick={() => { if (window.confirm('Cancel this feature?')) onStatusChange('cancelled') }}
                className="flex items-center gap-1 text-[10px] text-red-400/60 hover:text-red-400 transition-colors">
                <Ban className="h-3 w-3" />Cancel Feature
              </button>
            </div>
          )}
        </div>
      ) : activeTab === 'audit' ? (
        <AuditTrailTab
          featureId={feature.id}
          featureStatus={feature.status}
          packets={handoffPackets}
          loading={handoffLoading}
          approvedBy={feature.approved_by}
        />
      ) : null}

      {/* Bottom spacer */}
      <div className="flex-shrink-0 h-2" />
    </motion.div>
  )
}

// ─── Droppable Column ────────────────────────────────────────────
function DroppableColumn({
  column,
  features,
  agents,
  onFeatureClick,
  onStatusChange,
  updatingIds,
  justMovedIds,
  colIndex,
}: {
  column: typeof columns[0]
  features: Feature[]
  agents: Agent[]
  onFeatureClick: (feature: Feature) => void
  onStatusChange: (featureId: string, status: FeatureStatus) => void
  updatingIds: Record<string, boolean>
  justMovedIds: Set<string>
  colIndex: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const Icon = column.icon
  const [showAllDone, setShowAllDone] = useState(false)
  const DONE_DISPLAY_LIMIT = 10

  const allColumnFeatures = features.filter(f => f.status === column.id)
  const columnFeatures = column.id === 'done' && !showAllDone && allColumnFeatures.length > DONE_DISPLAY_LIMIT
    ? allColumnFeatures.slice(0, DONE_DISPLAY_LIMIT)
    : allColumnFeatures
  const hiddenCount = allColumnFeatures.length - columnFeatures.length

  // Alternating lane backgrounds per design spec
  const laneBg = colIndex % 2 === 0 ? "bg-[#1a1a2e]/30" : "bg-[#16213e]/30"

  return (
    <div className={cn("flex-1 min-w-[140px] rounded-md", laneBg)}>
      <div className="flex items-center gap-1 mb-2 px-0.5 pt-1">
        <Icon className={cn("h-3 w-3", column.color)} />
        <h3 className="text-[10px] font-medium text-white/60 truncate uppercase tracking-wider">{column.label}</h3>
        <span className="text-[9px] text-white/30 bg-white/5 px-1 rounded">{allColumnFeatures.length}</span>
        {(() => {
          const total = allColumnFeatures.reduce((sum, f) => sum + (f.estimated_cost || 0), 0)
          return total > 0 ? (
            <span className="text-[9px] text-green-400/50 bg-green-500/5 px-1 rounded" title="Column estimated cost total">
              ${total.toFixed(0)}
            </span>
          ) : null
        })()}
      </div>
      <div ref={setNodeRef} className={cn("space-y-2 min-h-[100px] rounded-md p-1 transition-all", isOver && "bg-purple-400/5 ring-1 ring-purple-400/20")}>
        <SortableContext items={columnFeatures.map(f => f.id)} strategy={verticalListSortingStrategy}>
          {columnFeatures.map((feature) => (
            <SortableFeatureCard
              key={feature.id}
              feature={feature}
              agents={agents}
              onClick={() => onFeatureClick(feature)}
              onStatusChange={(status) => onStatusChange(feature.id, status)}
              isUpdating={Boolean(updatingIds[feature.id])}
              isJustMoved={justMovedIds.has(feature.id)}
            />
          ))}
        </SortableContext>
        {hiddenCount > 0 && (
          <button onClick={() => setShowAllDone(true)} className="w-full p-1.5 text-[10px] text-white/40 hover:text-white/60 bg-white/5 hover:bg-white/10 rounded transition-all">
            Show {hiddenCount} more
          </button>
        )}
        {showAllDone && allColumnFeatures.length > DONE_DISPLAY_LIMIT && (
          <button onClick={() => setShowAllDone(false)} className="w-full p-1.5 text-[10px] text-white/40 hover:text-white/60 bg-white/5 hover:bg-white/10 rounded transition-all">Collapse</button>
        )}
        {allColumnFeatures.length === 0 && !isOver && (
          <div className="p-2 rounded border border-dashed border-white/10 text-center"><p className="text-[10px] text-white/20">No features</p></div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export function FeatureBoard() {
  const {
    features,
    setFeatures,
    connectionStatus,
    activityLog,
    justMoved,
    isLoading: realtimeLoading,
    isDemoMode,
    lastConnectedAt,
  } = useRealtimeFeatures()
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [boardNotice, setBoardNotice] = useState<{ type: 'error' | 'info'; message: string } | null>(null)
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({})
  const [showActivityFeed, setShowActivityFeed] = useState(false)
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))

  // Clock tick every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  // Keep selected feature in sync with realtime updates
  useEffect(() => {
    if (selectedFeature) {
      const updated = features.find(f => f.id === selectedFeature.id)
      if (updated && updated !== selectedFeature) setSelectedFeature(updated)
    }
  }, [features, selectedFeature])

  const loadAgents = useCallback(async () => {
    if (isDemoMode) { setFeatures(demoFeatures); setAgents(demoAgents); setIsLoading(false); return }
    try {
      const sb = supabase!
      const { data: ad, error: ae } = await sb.from('agents').select('id, name, emoji')
      if (ae) throw ae
      setAgents(ad || [])
    } catch (err) {
      console.error('Error loading agents:', err)
      setAgents(demoAgents)
    } finally { setIsLoading(false) }
  }, [isDemoMode])

  useEffect(() => { loadAgents() }, [loadAgents])

  const handleStatusChange = useCallback(async (featureId: string, newStatus: FeatureStatus) => {
    // Check valid transition
    const feature = features.find(f => f.id === featureId)
    if (feature) {
      const allowed = validTransitions[feature.status]
      if (allowed && !allowed.includes(newStatus)) {
        return
      }
    }

    if (updatingIds[featureId]) return

    if (isDemoMode) {
      setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, status: newStatus, updated_at: new Date().toISOString() } : f))
      setSelectedFeature(prev => prev && prev.id === featureId ? { ...prev, status: newStatus } : prev)
      setBoardNotice({ type: 'info', message: "Demo mode — changes are local only." })
      return
    }

    const previous = feature ? { ...feature } : undefined
    setUpdatingIds(prev => ({ ...prev, [featureId]: true }))
    setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, status: newStatus, updated_at: new Date().toISOString() } : f))
    setSelectedFeature(prev => prev && prev.id === featureId ? { ...prev, status: newStatus } : prev)

    try {
      const res = await fetch(`/api/features/${featureId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Status update failed")
    } catch {
      if (previous) {
        setFeatures(prev => prev.map(f => f.id === featureId ? previous : f))
        setSelectedFeature(prev => prev && prev.id === featureId ? { ...prev, status: previous.status } : prev)
      }
      setBoardNotice({ type: 'error', message: "Status update failed. Reverted." })
    } finally {
      setUpdatingIds(prev => {
        const { [featureId]: _removed, ...rest } = prev
        return rest
      })
    }
  }, [features, isDemoMode, updatingIds])

  const handleReassign = useCallback(async (featureId: string, newAgentId: string | null) => {
    const feature = features.find(f => f.id === featureId)
    if (updatingIds[featureId]) return

    if (isDemoMode) {
      setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, assigned_to: newAgentId, updated_at: new Date().toISOString() } : f))
      setSelectedFeature(prev => prev && prev.id === featureId ? { ...prev, assigned_to: newAgentId } : prev)
      setBoardNotice({ type: 'info', message: "Demo mode — changes are local only." })
      return
    }

    const previousAssigned = feature?.assigned_to ?? null
    setUpdatingIds(prev => ({ ...prev, [featureId]: true }))
    setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, assigned_to: newAgentId, updated_at: new Date().toISOString() } : f))
    setSelectedFeature(prev => prev && prev.id === featureId ? { ...prev, assigned_to: newAgentId } : prev)
    try {
      const res = await fetch(`/api/features/${featureId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: newAgentId }),
      })
      if (!res.ok) throw new Error("Reassign failed")
    } catch {
      setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, assigned_to: previousAssigned } : f))
      setSelectedFeature(prev => prev && prev.id === featureId ? { ...prev, assigned_to: previousAssigned } : prev)
      setBoardNotice({ type: 'error', message: "Update failed. Try again." })
    } finally {
      setUpdatingIds(prev => {
        const { [featureId]: _removed, ...rest } = prev
        return rest
      })
    }
  }, [features, isDemoMode, updatingIds])

  const handleDragStart = (event: DragStartEvent) => { setActiveId(event.active.id as string) }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const featureId = active.id as string
    const overId = over.id as string

    const targetColumn = columns.find(c => c.id === overId)
    if (targetColumn) {
      const feature = features.find(f => f.id === featureId)
      if (feature && feature.status !== targetColumn.id) handleStatusChange(featureId, targetColumn.id)
      return
    }
    const targetFeature = features.find(f => f.id === overId)
    if (targetFeature) {
      const feature = features.find(f => f.id === featureId)
      if (feature && feature.status !== targetFeature.status) handleStatusChange(featureId, targetFeature.status)
    }
  }

  const activeFeature = activeId ? features.find(f => f.id === activeId) : null
  const filteredFeatures = features.filter(f => {
    if (searchQuery && !f.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterPriority && f.priority !== filterPriority) return false
    return true
  })

  if (isLoading || realtimeLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-white/50">Loading pipeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between h-10">
        <div className="flex items-center gap-3">
          <ConnectionIndicator status={connectionStatus} lastConnectedAt={lastConnectedAt} />
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Rocket className="h-4 w-4 text-purple-400" />
            PIPELINE BOARD
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActivityFeed(!showActivityFeed)}
            className={cn(
              "px-2 py-1 text-[10px] rounded transition-all border",
              showActivityFeed
                ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                : "text-white/40 border-white/10 hover:text-white/60 hover:border-white/20"
            )}
          >
            Activity Feed {showActivityFeed ? "◂" : "▸"}
          </button>
          <span className="text-[11px] text-white/30 font-mono">{clock}</span>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowCreate(true)}>
            <Plus className="h-3 w-3" />New
          </Button>
        </div>
      </div>

      {/* Activity Feed Sidebar */}
      <PipelineActivityFeed
        events={activityLog}
        open={showActivityFeed}
        onClose={() => setShowActivityFeed(false)}
      />

      {isDemoMode && (
        <div className="px-2 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 text-yellow-400" />
            <div className="text-[10px] text-yellow-400/80">
              <p>Demo mode — Connect Supabase for live data</p>
              <p className="text-yellow-400/60">Changes won’t persist after refresh.</p>
            </div>
          </div>
        </div>
      )}

      {boardNotice?.type === 'error' && (
        <ErrorBanner
          message={boardNotice.message}
          onDismiss={() => setBoardNotice(null)}
          className="py-2"
        />
      )}
      {boardNotice?.type === 'info' && (
        <div className="px-2 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 text-yellow-400" />
            <p className="text-[10px] text-yellow-400/80">{boardNotice.message}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
          <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-7 pl-7 text-xs bg-white/5 border-white/10" />
        </div>
        <div className="flex items-center gap-0.5">
          <Filter className="h-3 w-3 text-white/30 mr-1" />
          {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
            <button key={p} onClick={() => setFilterPriority(filterPriority === p ? null : p)}
              className={cn("px-1.5 py-0.5 text-[10px] rounded transition-all", filterPriority === p ? priorityConfig[p].color : "bg-white/5 text-white/40 hover:bg-white/10")}>
              {priorityConfig[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <LayoutGroup>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {columns.map((column, colIdx) => (
              <DroppableColumn
                key={column.id}
                column={column}
                features={filteredFeatures}
                agents={agents}
                onFeatureClick={setSelectedFeature}
                onStatusChange={handleStatusChange}
                updatingIds={updatingIds}
                justMovedIds={justMoved}
                colIndex={colIdx}
              />
            ))}
          </div>
          <DragOverlay>
            {activeFeature ? <FeatureCardPlain feature={activeFeature} /> : null}
          </DragOverlay>
        </DndContext>
      </LayoutGroup>

      {/* Panels */}
      <AnimatePresence>
        {selectedFeature && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedFeature(null)} />
            <FeatureDetailPanel
              feature={selectedFeature}
              agents={agents}
              onClose={() => setSelectedFeature(null)}
              onStatusChange={(status) => handleStatusChange(selectedFeature.id, status)}
              onReassign={(agentId) => handleReassign(selectedFeature.id, agentId)}
              onError={(message) => setBoardNotice({ type: 'error', message })}
            />
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowCreate(false)} />
            <CreateFeaturePanel
              agents={agents}
              onClose={() => setShowCreate(false)}
              onCreated={(feature) => setFeatures(prev => [feature, ...prev])}
              isDemoMode={isDemoMode}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
