"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Clock,
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ErrorBanner } from "@/components/shared/ErrorBanner"
import { supabase } from "@/lib/supabase"

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
  { id: 'planning' as FeatureStatus, label: 'Planning', icon: Lightbulb, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
  { id: 'design_review' as FeatureStatus, label: 'Design Review', icon: PenTool, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { id: 'in_progress' as FeatureStatus, label: 'In Progress', icon: PlayCircle, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  { id: 'qa_review' as FeatureStatus, label: 'QA Review', icon: TestTube2, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
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
    created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '2', title: 'Learning Log Dashboard', description: 'UI to display agent learning activities',
    status: 'planning', priority: 'medium', requested_by: 'HBx_IN3', assigned_to: null, approved_by: null,
    acceptance_criteria: null, labels: ['ui', 'innovation'],
    pr_url: null, pr_number: null, pr_status: null, branch_name: null,
    vercel_preview_url: null, feature_spec: null, design_spec: null,
    created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date().toISOString(),
  },
]

// ─── Pipeline Progress Bar ───────────────────────────────────────
function PipelineProgress({ status }: { status: FeatureStatus }) {
  if (status === 'cancelled') return null
  const currentIndex = pipelineStatuses.indexOf(status)
  const total = pipelineStatuses.length

  return (
    <div className="flex items-center gap-0.5">
      {pipelineStatuses.map((s, i) => {
        const col = columns.find(c => c.id === s)
        const isComplete = i < currentIndex
        const isCurrent = i === currentIndex
        return (
          <div
            key={s}
            title={col?.label || s}
            className={cn(
              "h-1 flex-1 rounded-full transition-all",
              isComplete ? "bg-green-400/60" :
              isCurrent && s === 'done' ? "bg-green-400/80" :
              isCurrent ? "bg-purple-400/80" :
              "bg-white/10"
            )}
          />
        )
      })}
      <span className="text-[9px] text-white/30 ml-1">{currentIndex + 1}/{total}</span>
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
}: {
  feature: Feature
  agents: Agent[]
  onClick: () => void
  onStatusChange: (status: FeatureStatus) => void
  isUpdating: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: feature.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const priority = priorityConfig[feature.priority]
  const assignedAgent = agents.find(a => a.id === feature.assigned_to)
  const requestedAgent = agents.find(a => a.id === feature.requested_by)

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative">
      <div
        onClick={onClick}
        className={cn(
          "p-2 rounded-md bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer group",
          isUpdating && "opacity-70"
        )}
      >
        {isUpdating && (
          <div className="absolute top-1 right-1 flex items-center gap-1 text-[9px] text-white/60">
            <Loader2 className="h-3 w-3 animate-spin text-purple-300" />
          </div>
        )}
        <div className="flex items-start gap-1.5 mb-1">
          <button {...listeners} className="mt-0.5 opacity-0 group-hover:opacity-40 hover:!opacity-80 cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="h-3 w-3 text-white/50" />
          </button>
          <Badge className={cn("text-[9px] px-1 py-0 h-4 flex-shrink-0 border", priority.color)}>
            {priority.label}
          </Badge>
          <h4 className="text-xs font-medium text-white/90 leading-tight line-clamp-2 group-hover:text-purple-300 transition-colors flex-1">
            {feature.title}
          </h4>
        </div>

        {/* Pipeline progress mini */}
        <div className="pl-[18px] mb-1">
          <PipelineProgress status={feature.status} />
        </div>

        <div className="flex items-center justify-between pl-[18px]">
          <div className="flex items-center gap-1">
            {requestedAgent && <span className="text-[10px]" title={requestedAgent.name}>{requestedAgent.emoji}</span>}
            {requestedAgent && assignedAgent && <ArrowRight className="h-2 w-2 text-white/20" />}
            {assignedAgent && <span className="text-[10px]" title={assignedAgent.name}>{assignedAgent.emoji}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {feature.vercel_preview_url && <span title="Vercel Preview"><Globe className="h-3 w-3 text-cyan-400" /></span>}
            {feature.pr_url && <GitPullRequest className={cn("h-3 w-3", feature.pr_status === 'merged' ? 'text-green-400' : 'text-purple-400')} />}
            <StatusDropdown currentStatus={feature.status} onStatusChange={onStatusChange} disabled={isUpdating} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Plain Card (for drag overlay) ──────────────────────────────
function FeatureCardPlain({ feature }: { feature: Feature }) {
  const priority = priorityConfig[feature.priority]
  return (
    <div className="p-2 rounded-md bg-white/[0.06] border border-purple-400/40 shadow-lg shadow-purple-500/10 w-[200px]">
      <div className="flex items-start gap-1.5">
        <Badge className={cn("text-[9px] px-1 py-0 h-4 flex-shrink-0 border", priority.color)}>{priority.label}</Badge>
        <h4 className="text-xs font-medium text-white/90 leading-tight line-clamp-2">{feature.title}</h4>
      </div>
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
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Feature['priority']>("medium")
  const [assignedTo, setAssignedTo] = useState("")
  const [labels, setLabels] = useState("")
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ type: 'error' | 'info'; message: string } | null>(null)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: "👋 I'm **IN1** — your Product Architect. Let's plan this feature together.\n\nWhat problem are you looking to solve?" },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatting, setChatting] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [mode, setMode] = useState<'chat' | 'form'>('chat')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, streamingContent])

  const assistantMessageCount = chatMessages.filter(m => m.role === 'assistant').length

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatting || isStreaming) return
    const msg = chatInput.trim()
    setChatInput("")
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: msg }]
    setChatMessages(updatedMessages)
    setChatting(true)

    try {
      abortControllerRef.current = new AbortController()
      const res = await fetch('/api/features/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok || !res.body) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: "I'm having trouble connecting. You can use the Form tab to create the feature manually.",
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

  const handleCreateFromChat = async () => {
    if (saving) return
    setSaving(true)
    setNotice(null)

    // Format chat transcript as markdown
    const transcript = chatMessages
      .map(m => m.role === 'user' ? `**User:** ${m.content}` : `**IN1:** ${m.content}`)
      .join('\n\n')

    // Extract title: look for markdown heading or **Title:** in last assistant message
    const lastAssistant = [...chatMessages].reverse().find(m => m.role === 'assistant')
    let extractedTitle = ''
    if (lastAssistant) {
      const headingMatch = lastAssistant.content.match(/^#\s+(.+)$/m)
      const titleMatch = lastAssistant.content.match(/\*\*Title:\*\*\s*(.+)/i)
      extractedTitle = headingMatch?.[1] || titleMatch?.[1] || ''
    }
    if (!extractedTitle) {
      // Fallback: first user message truncated
      const firstUser = chatMessages.find(m => m.role === 'user')
      extractedTitle = firstUser ? firstUser.content.slice(0, 80) : 'Untitled Feature'
    }

    const newFeature = {
      title: extractedTitle.trim(),
      description: null,
      priority: 'medium' as const,
      status: 'planning' as const,
      assigned_to: 'HBx_IN1',
      requested_by: 'Lance',
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      onClose()
      setSaving(false)
      return
    }

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
    } catch {
      setNotice({ type: 'error', message: "Couldn't create feature. Check connection and try again." })
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setSaving(true)
    setNotice(null)

    const newFeature = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: 'planning' as const,
      assigned_to: assignedTo || null,
      requested_by: 'Lance',
      labels: labels.trim() ? labels.split(',').map(l => l.trim()) : null,
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
        feature_spec: null,
        design_spec: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      onClose()
      setSaving(false)
      return
    }

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
    } catch {
      setNotice({ type: 'error', message: "Couldn't create feature. Check connection and try again." })
    } finally {
      setSaving(false)
    }
  }

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
        {/* Mode tabs */}
        <div className="flex gap-1 mt-2">
          <button onClick={() => setMode('chat')} className={cn("px-2 py-1 text-[10px] rounded transition-all", mode === 'chat' ? "bg-purple-500/20 text-purple-300" : "text-white/40 hover:text-white/60")}>
            <MessageSquare className="h-3 w-3 inline mr-1" />Planning Chat
          </button>
          <button onClick={() => setMode('form')} className={cn("px-2 py-1 text-[10px] rounded transition-all", mode === 'form' ? "bg-white/10 text-white/80" : "text-white/40 hover:text-white/60")}>
            <FileText className="h-3 w-3 inline mr-1" />Form
          </button>
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

      {mode === 'chat' ? (
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
                Create Feature from Chat
              </Button>
            </div>
          )}
          {/* Chat input */}
          <div className="flex-shrink-0 p-3 border-t border-white/10">
            <div className="flex gap-2">
              <Input
                placeholder="Describe your feature idea..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                disabled={chatting || isStreaming}
                className="flex-1 h-8 text-xs bg-white/5 border-white/10"
                autoFocus
              />
              <Button size="sm" onClick={handleChatSend} disabled={!chatInput.trim() || chatting || isStreaming} className="h-8 w-8 p-0">
                {chatting || isStreaming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
            </div>
            <p className="text-[9px] text-white/20 mt-1">Plan with IN1, then create directly • Or use Form tab for quick entry</p>
          </div>
        </>
      ) : (
        <>
          {/* Form */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Title *</label>
              <Input placeholder="Feature title..." value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-8 text-xs bg-white/5 border-white/10" autoFocus />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Description</label>
              <textarea placeholder="What should this feature do?" value={description} onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full h-20 text-xs bg-white/5 border border-white/10 rounded-md p-2 text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-purple-400/50 resize-none" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Priority</label>
              <div className="flex gap-1.5 mt-1">
                {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                  <button key={p} onClick={() => setPriority(p)}
                    className={cn("px-2 py-1 text-[10px] rounded border transition-all", priority === p ? priorityConfig[p].color : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10")}>
                    {priorityConfig[p].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Assign To</label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
                className="mt-1 w-full h-8 text-xs bg-white/5 border border-white/10 rounded-md px-2 text-white/80 focus:outline-none focus:ring-1 focus:ring-purple-400/50">
                <option value="">Unassigned</option>
                {agents.map((a) => (<option key={a.id} value={a.id}>{a.emoji} {a.name} ({a.id})</option>))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Labels</label>
              <Input placeholder="ui, core, sales (comma separated)" value={labels} onChange={(e) => setLabels(e.target.value)} className="mt-1 h-8 text-xs bg-white/5 border-white/10" />
            </div>
          </div>
          <div className="flex-shrink-0 p-3 border-t border-white/10 flex gap-2">
            <Button variant="ghost" onClick={onClose} className="h-8 text-xs flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || saving} className="h-8 text-xs flex-1 bg-purple-600 hover:bg-purple-500">
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                "Create Feature"
              )}
            </Button>
          </div>
        </>
      )}
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
  const [loading, setLoading] = useState(false)
  const allowed = validTransitions[feature.status]?.includes(targetStatus)
  if (!allowed) return null

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
            body: JSON.stringify({ target_status: targetStatus, approved_by: 'Lance' }),
          })
          if (!res.ok) {
            onError("Update failed. Try again.")
            return
          }
          onApprove(targetStatus)
        } catch {
          onError("Update failed. Try again.")
        } finally {
          setLoading(false)
        }
      }}
      disabled={loading}
      className="h-7 text-[10px] gap-1 bg-emerald-600/80 hover:bg-emerald-500 text-white"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
      {label}
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
  const [newMessage, setNewMessage] = useState("")
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [sending, setSending] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'specs'>('details')
  const [showReassign, setShowReassign] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => { if (activeTab === 'chat') scrollToBottom() }, [messages, streamingContent, activeTab, scrollToBottom])

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
      id: `opt-${Date.now()}`, work_item_id: feature.id, sender_type: 'user', sender_id: 'Lance',
      sender_name: 'Lance', content, metadata: {}, created_at: new Date().toISOString(),
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
        body: JSON.stringify({ sender_type: 'user', sender_id: 'Lance', sender_name: 'Lance', content: messageContent }),
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
            {/* Pipeline Progress */}
            <div className="mt-1.5">
              <PipelineProgress status={feature.status} />
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
              <ApproveButton feature={feature} targetStatus="approved" label="Approve → Ready" onApprove={onStatusChange} onError={onError} />
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-2">
          <button onClick={() => setActiveTab('details')} className={cn("px-2 py-1 text-[10px] rounded transition-all", activeTab === 'details' ? "bg-white/10 text-white/80" : "text-white/40 hover:text-white/60")}>Details</button>
          <button onClick={() => setActiveTab('specs')} className={cn("px-2 py-1 text-[10px] rounded transition-all", activeTab === 'specs' ? "bg-blue-500/20 text-blue-300" : "text-white/40 hover:text-white/60")}>
            <FileText className="h-3 w-3 inline mr-1" />Specs
          </button>
          <button onClick={() => setActiveTab('chat')} className={cn("px-2 py-1 text-[10px] rounded transition-all", activeTab === 'chat' ? "bg-purple-500/20 text-purple-300" : "text-white/40 hover:text-white/60")}>
            <MessageSquare className="h-3 w-3 inline mr-1" />Chat {messages.length > 0 && `(${messages.length})`}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' ? (
        <div className="flex-1 overflow-y-auto">
          {feature.description && (
            <div className="p-3 border-b border-white/5"><p className="text-xs text-white/70">{feature.description}</p></div>
          )}
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-white/30" /><span className="text-white/50">Requested:</span>
                {requestedAgent ? <span className="text-white/80">{requestedAgent.emoji} {requestedAgent.id}</span> : <span className="text-white/40">—</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <Bot className="h-3 w-3 text-white/30" /><span className="text-white/50">Assigned:</span>
                {showReassign ? (
                  <select className="bg-white/10 text-white/80 text-[10px] rounded px-1 py-0.5 border border-white/10" value={feature.assigned_to || ''}
                    onChange={(e) => { onReassign(e.target.value || null); setShowReassign(false) }} onBlur={() => setShowReassign(false)} autoFocus>
                    <option value="">Unassigned</option>
                    {agents.map(a => (<option key={a.id} value={a.id}>{a.emoji} {a.id} — {a.name}</option>))}
                  </select>
                ) : (
                  <button onClick={() => setShowReassign(true)} className="text-white/80 hover:text-purple-300 transition-colors cursor-pointer" title="Click to reassign">
                    {assignedAgent ? <>{assignedAgent.emoji} {assignedAgent.id}</> : <span className="text-white/40">Unassigned — click to assign</span>}
                  </button>
                )}
              </div>
              {feature.approved_by && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-green-400/50" /><span className="text-white/50">Approved:</span><span className="text-white/80">{feature.approved_by}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-white/30" /><span className="text-white/50">Created:</span><span className="text-white/80">{new Date(feature.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {feature.status !== 'cancelled' && feature.status !== 'done' && (
              <button onClick={() => { if (window.confirm('Cancel this feature?')) onStatusChange('cancelled') }}
                className="mt-2 flex items-center gap-1 text-[10px] text-red-400/60 hover:text-red-400 transition-colors">
                <X className="h-3 w-3" />Cancel Feature
              </button>
            )}
            {feature.labels && feature.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {feature.labels.map((label) => (<span key={label} className="px-1.5 py-0.5 text-[9px] rounded bg-white/5 text-white/50">{label}</span>))}
              </div>
            )}
          </div>

          <div className="p-3 border-b border-white/5 space-y-1.5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Links</div>
            {feature.vercel_preview_url && (
              <a href={feature.vercel_preview_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-[11px] text-cyan-400 hover:text-cyan-300">
                <Globe className="h-3 w-3" /><span>Vercel Preview</span><ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
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

          {feature.acceptance_criteria && (
            <div className="p-3 border-b border-white/5">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Acceptance Criteria</div>
              <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono">{feature.acceptance_criteria}</pre>
            </div>
          )}
        </div>
      ) : activeTab === 'specs' ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Feature Spec</div>
            {feature.feature_spec ? (
              <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono bg-white/[0.02] rounded p-2 border border-white/5">{feature.feature_spec}</pre>
            ) : (
              <p className="text-[11px] text-white/30">No feature spec yet. The Product Architect will generate this during planning.</p>
            )}
          </div>
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Design Spec</div>
            {feature.design_spec ? (
              <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono bg-white/[0.02] rounded p-2 border border-white/5">{feature.design_spec}</pre>
            ) : (
              <p className="text-[11px] text-white/30">No design spec yet. Created during design review phase.</p>
            )}
          </div>
        </div>
      ) : (
        /* Chat Tab */
        <div className="flex-1 overflow-y-auto p-3">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
              <span className="text-[10px] text-white/30 ml-2">Loading chat...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Zap className="h-6 w-6 text-purple-400/40 mb-2" />
              <p className="text-[11px] text-white/40">No messages yet</p>
              <p className="text-[10px] text-white/25 mt-1">
                {assignedAgent ? `Message ${assignedAgent.emoji} ${assignedAgent.name}` : 'Assign an agent first'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (<BridgeChatMessage key={msg.id} msg={msg} agents={agents} />))}
              {isStreaming && streamingContent && (
                <div className="flex gap-2">
                  <span className="text-sm flex-shrink-0 mt-0.5">{assignedAgent?.emoji || '🤖'}</span>
                  <div className="max-w-[80%] rounded-lg px-2.5 py-1.5 bg-white/[0.04] border border-white/10">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[10px] font-medium text-white/70">{assignedAgent?.name || 'Agent'}</span>
                      <Badge className="text-[8px] px-1 py-0 h-3.5 border bg-purple-500/20 text-purple-300 border-purple-500/30">agent</Badge>
                    </div>
                    <p className="text-[11px] text-white/70 whitespace-pre-wrap">{streamingContent}</p>
                  </div>
                </div>
              )}
              {sending && !isStreaming && (
                <div className="flex gap-2">
                  <span className="text-sm flex-shrink-0 mt-0.5">{assignedAgent?.emoji || '🤖'}</span>
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
          )}
        </div>
      )}

      {/* Chat Input */}
      <div className="flex-shrink-0 p-3 border-t border-white/10">
        {!assignedAgent && activeTab === 'chat' ? (
          <div className="flex items-center gap-2 text-[10px] text-yellow-400/60">
            <AlertCircle className="h-3 w-3" /><span>Assign an agent to enable Live Bridge chat</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input placeholder={activeTab === 'chat' ? `Message ${assignedAgent?.name || 'agent'}...` : 'Switch to Chat tab'}
              value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={activeTab !== 'chat' || sending} className="flex-1 h-8 text-xs bg-white/5 border-white/10" />
            <Button size="sm" onClick={handleSendMessage} disabled={!newMessage.trim() || sending || activeTab !== 'chat'} className="h-8 w-8 p-0">
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            </Button>
          </div>
        )}
      </div>
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
}: {
  column: typeof columns[0]
  features: Feature[]
  agents: Agent[]
  onFeatureClick: (feature: Feature) => void
  onStatusChange: (featureId: string, status: FeatureStatus) => void
  updatingIds: Record<string, boolean>
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

  return (
    <div className="flex-shrink-0 w-[170px]">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Icon className={cn("h-3 w-3", column.color)} />
        <h3 className="text-[10px] font-medium text-white/80 truncate">{column.label}</h3>
        <span className="text-[9px] text-white/30 bg-white/5 px-1 rounded">{allColumnFeatures.length}</span>
      </div>
      <div ref={setNodeRef} className={cn("space-y-1.5 min-h-[100px] rounded-md p-1 transition-all", isOver && "bg-purple-400/5 ring-1 ring-purple-400/20")}>
        <SortableContext items={columnFeatures.map(f => f.id)} strategy={verticalListSortingStrategy}>
          {columnFeatures.map((feature) => (
            <SortableFeatureCard
              key={feature.id}
              feature={feature}
              agents={agents}
              onClick={() => onFeatureClick(feature)}
              onStatusChange={(status) => onStatusChange(feature.id, status)}
              isUpdating={Boolean(updatingIds[feature.id])}
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
          <div className="p-2 rounded border border-dashed border-white/10 text-center"><p className="text-[10px] text-white/20">Empty</p></div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export function FeatureBoard() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [boardNotice, setBoardNotice] = useState<{ type: 'error' | 'info'; message: string } | null>(null)
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({})
  const isDemoMode = !supabase

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const loadData = useCallback(async () => {
    if (isDemoMode) { setFeatures(demoFeatures); setAgents(demoAgents); setIsLoading(false); return }
    try {
      const sb = supabase!
      const [{ data: fd, error: fe }, { data: ad, error: ae }] = await Promise.all([
        sb.from('features').select('*').neq('status', 'cancelled').order('priority', { ascending: false }).order('created_at', { ascending: false }),
        sb.from('agents').select('id, name, emoji'),
      ])
      if (fe) throw fe
      if (ae) throw ae
      setFeatures(fd || [])
      setAgents(ad || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setFeatures(demoFeatures)
      setAgents(demoAgents)
    } finally { setIsLoading(false) }
  }, [isDemoMode])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase.channel('features-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'features' }, (payload) => {
        if (payload.eventType === 'INSERT') setFeatures(prev => [payload.new as Feature, ...prev])
        else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Feature
          setFeatures(prev => prev.map(f => f.id === updated.id ? updated : f))
          setSelectedFeature(prev => prev && prev.id === updated.id ? updated : prev)
        } else if (payload.eventType === 'DELETE') {
          setFeatures(prev => prev.filter(f => f.id !== (payload.old as { id: string }).id))
        }
      }).subscribe()
    return () => { supabase!.removeChannel(channel) }
  }, [])

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

  if (isLoading) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Rocket className="h-4 w-4 text-purple-400" />
            Feature Pipeline
          </h2>
          <p className="text-[11px] text-white/40">planning → design → build → QA → review → approve → PR → done</p>
        </div>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowCreate(true)}>
          <Plus className="h-3 w-3" />New
        </Button>
      </div>

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
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              features={filteredFeatures}
              agents={agents}
              onFeatureClick={setSelectedFeature}
              onStatusChange={handleStatusChange}
              updatingIds={updatingIds}
            />
          ))}
        </div>
        <DragOverlay>
          {activeFeature ? <FeatureCardPlain feature={activeFeature} /> : null}
        </DragOverlay>
      </DndContext>

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
