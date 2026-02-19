"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

// ─── Types ───────────────────────────────────────────────────────
interface Feature {
  id: string
  title: string
  description: string | null
  status: 'backlog' | 'planned' | 'in_progress' | 'review' | 'done' | 'cancelled'
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
  created_at: string
  updated_at: string
}

interface Comment {
  id: string
  author: string
  author_emoji: string
  content: string
  created_at: string
}

interface Agent {
  id: string
  name: string
  emoji: string | null
}

// ─── Config ──────────────────────────────────────────────────────
const columns = [
  { id: 'backlog', label: 'Backlog', icon: Lightbulb, color: 'text-gray-400' },
  { id: 'planned', label: 'Planned', icon: Clock, color: 'text-blue-400' },
  { id: 'in_progress', label: 'In Progress', icon: PlayCircle, color: 'text-yellow-400' },
  { id: 'review', label: 'Review', icon: Eye, color: 'text-purple-400' },
  { id: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-400' },
]

const priorityConfig = {
  low: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Low' },
  medium: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Med' },
  high: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'High' },
  urgent: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: '!!!' },
}

const statusConfig = {
  backlog: { color: 'bg-gray-500/20 text-gray-400', label: 'Backlog' },
  planned: { color: 'bg-blue-500/20 text-blue-400', label: 'Planned' },
  in_progress: { color: 'bg-yellow-500/20 text-yellow-400', label: 'In Progress' },
  review: { color: 'bg-purple-500/20 text-purple-400', label: 'Review' },
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
    id: '1', title: 'Agent-to-Agent Communication', description: 'Enable HBx to spawn and coordinate with sub-agents', status: 'in_progress', priority: 'high',
    requested_by: 'HBx', assigned_to: 'HBx_IN2', approved_by: 'Lance', acceptance_criteria: '- HBx can spawn sub-agents\n- Tasks route correctly', labels: ['core', 'infrastructure'],
    pr_url: null, pr_number: null, pr_status: null, branch_name: 'hbx/agent-communication', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '2', title: 'Learning Log Dashboard', description: 'UI to display agent learning activities', status: 'planned', priority: 'medium',
    requested_by: 'HBx_IN3', assigned_to: null, approved_by: null, acceptance_criteria: null, labels: ['ui', 'innovation'],
    pr_url: null, pr_number: null, pr_status: null, branch_name: null, created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '3', title: 'Competitive Intel Automation', description: 'Auto-scrape competitor pricing', status: 'backlog', priority: 'medium',
    requested_by: 'HBx_SL2', assigned_to: null, approved_by: null, acceptance_criteria: null, labels: ['sales'],
    pr_url: null, pr_number: null, pr_status: null, branch_name: null, created_at: new Date(Date.now() - 259200000).toISOString(), updated_at: new Date().toISOString(),
  },
]

const demoComments: Comment[] = [
  { id: '1', author: 'HBx', author_emoji: '🧠', content: 'Created feature request', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', author: 'Lance', author_emoji: '👤', content: 'Approved - high priority', created_at: new Date(Date.now() - 82800000).toISOString() },
]

// ─── Status Dropdown ─────────────────────────────────────────────
function StatusDropdown({ 
  currentStatus, 
  onStatusChange 
}: { 
  currentStatus: Feature['status']
  onStatusChange: (status: Feature['status']) => void 
}) {
  const [open, setOpen] = useState(false)
  const current = statusConfig[currentStatus]

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-all hover:ring-1 hover:ring-white/20", current.color)}
      >
        {current.label}
        <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute top-full left-0 mt-1 z-40 bg-black/95 border border-white/10 rounded-md py-1 min-w-[120px] shadow-xl">
            {columns.map((col) => (
              <button
                key={col.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange(col.id as Feature['status'])
                  setOpen(false)
                }}
                className={cn(
                  "w-full text-left px-2 py-1 text-[11px] hover:bg-white/10 flex items-center gap-2",
                  currentStatus === col.id && "bg-white/5"
                )}
              >
                <col.icon className={cn("h-3 w-3", col.color)} />
                <span className="text-white/80">{col.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sortable Feature Card ──────────────────────────────────────
function SortableFeatureCard({ 
  feature, agents, onClick, onStatusChange 
}: { 
  feature: Feature; agents: Agent[]; onClick: () => void; onStatusChange: (status: Feature['status']) => void 
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: feature.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const priority = priorityConfig[feature.priority]
  const assignedAgent = agents.find(a => a.id === feature.assigned_to)
  const requestedAgent = agents.find(a => a.id === feature.requested_by)

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={onClick}
        className="p-2 rounded-md bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer group"
      >
        <div className="flex items-start gap-1.5 mb-1">
          {/* Drag handle */}
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
        <div className="flex items-center justify-between mt-1.5 pl-[18px]">
          <div className="flex items-center gap-1">
            {requestedAgent && <span className="text-[10px]" title={requestedAgent.name}>{requestedAgent.emoji}</span>}
            {requestedAgent && assignedAgent && <ArrowRight className="h-2 w-2 text-white/20" />}
            {assignedAgent && <span className="text-[10px]" title={assignedAgent.name}>{assignedAgent.emoji}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {feature.pr_url && (
              <GitPullRequest className={cn("h-3 w-3", feature.pr_status === 'merged' ? 'text-green-400' : 'text-purple-400')} />
            )}
            <StatusDropdown currentStatus={feature.status} onStatusChange={onStatusChange} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Plain Card (for drag overlay) ──────────────────────────────
function FeatureCardPlain({ feature, agents }: { feature: Feature; agents: Agent[] }) {
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

// ─── Create Feature Panel ────────────────────────────────────────
function CreateFeaturePanel({
  agents,
  onClose,
  onCreated,
}: {
  agents: Agent[]
  onClose: () => void
  onCreated: (feature: Feature) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Feature['priority']>("medium")
  const [assignedTo, setAssignedTo] = useState("")
  const [labels, setLabels] = useState("")
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return
    setSaving(true)

    const newFeature = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: 'backlog' as const,
      assigned_to: assignedTo || null,
      requested_by: 'Lance',
      labels: labels.trim() ? labels.split(',').map(l => l.trim()) : null,
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('features')
          .insert(newFeature)
          .select()
          .single()
        if (error) throw error
        onCreated(data)
        onClose()
        return
      } catch (err) {
        console.error('Error creating feature:', err)
      }
    }

    // Demo fallback
    onCreated({
      ...newFeature,
      id: crypto.randomUUID(),
      approved_by: null,
      acceptance_criteria: null,
      pr_url: null,
      pr_number: null,
      pr_status: null,
      branch_name: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    onClose()
    setSaving(false)
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
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Title */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider">Title *</label>
          <Input
            placeholder="Feature title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 h-8 text-xs bg-white/5 border-white/10"
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider">Description</label>
          <textarea
            placeholder="What should this feature do?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full h-20 text-xs bg-white/5 border border-white/10 rounded-md p-2 text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-purple-400/50 resize-none"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider">Priority</label>
          <div className="flex gap-1.5 mt-1">
            {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  "px-2 py-1 text-[10px] rounded border transition-all",
                  priority === p
                    ? priorityConfig[p].color
                    : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                )}
              >
                {priorityConfig[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Assign To */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider">Assign To</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="mt-1 w-full h-8 text-xs bg-white/5 border border-white/10 rounded-md px-2 text-white/80 focus:outline-none focus:ring-1 focus:ring-purple-400/50"
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.emoji} {a.name} ({a.id})</option>
            ))}
          </select>
        </div>

        {/* Labels */}
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wider">Labels</label>
          <Input
            placeholder="ui, core, sales (comma separated)"
            value={labels}
            onChange={(e) => setLabels(e.target.value)}
            className="mt-1 h-8 text-xs bg-white/5 border-white/10"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t border-white/10 flex gap-2">
        <Button variant="ghost" onClick={onClose} className="h-8 text-xs flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!title.trim() || saving}
          className="h-8 text-xs flex-1 bg-purple-600 hover:bg-purple-500"
        >
          {saving ? "Creating..." : "Create Feature"}
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Feature Detail Panel ────────────────────────────────────────
function FeatureDetailPanel({
  feature,
  agents,
  onClose,
  onStatusChange,
}: {
  feature: Feature
  agents: Agent[]
  onClose: () => void
  onStatusChange: (status: Feature['status']) => void
}) {
  const [newComment, setNewComment] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)

  const priority = priorityConfig[feature.priority]
  const assignedAgent = agents.find(a => a.id === feature.assigned_to)
  const requestedAgent = agents.find(a => a.id === feature.requested_by)

  useEffect(() => {
    async function loadComments() {
      if (!supabase) { setComments(demoComments); setLoadingComments(false); return }
      try {
        const { data, error } = await supabase.from('feature_comments').select('*').eq('feature_id', feature.id).order('created_at', { ascending: true })
        if (error) throw error
        setComments((data || []).map((c: { id: string; agent_id: string; message: string; created_at: string }) => {
          const agent = agents.find(a => a.id === c.agent_id)
          return { id: c.id, author: c.agent_id, author_emoji: agent?.emoji || '🤖', content: c.message, created_at: c.created_at }
        }))
      } catch { setComments(demoComments) }
      finally { setLoadingComments(false) }
    }
    loadComments()
  }, [feature.id, agents])

  const handleSendComment = async () => {
    if (!newComment.trim()) return
    if (supabase) {
      try {
        const { data, error } = await supabase.from('feature_comments').insert({ feature_id: feature.id, agent_id: 'Lance', message: newComment.trim(), comment_type: 'message' }).select().single()
        if (error) throw error
        setComments(prev => [...prev, { id: data.id, author: 'Lance', author_emoji: '👤', content: data.message, created_at: data.created_at }])
      } catch (err) { console.error('Error saving comment:', err) }
    }
    setNewComment("")
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
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 flex-shrink-0"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Content */}
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
              {assignedAgent ? <span className="text-white/80">{assignedAgent.emoji} {assignedAgent.id}</span> : <span className="text-white/40">Unassigned</span>}
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
          {feature.labels && feature.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {feature.labels.map((label) => (<span key={label} className="px-1.5 py-0.5 text-[9px] rounded bg-white/5 text-white/50">{label}</span>))}
            </div>
          )}
        </div>

        <div className="p-3 border-b border-white/5 space-y-1.5">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Links</div>
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
          {!feature.branch_name && !feature.pr_url && <p className="text-[11px] text-white/30">No links yet</p>}
        </div>

        {feature.acceptance_criteria && (
          <div className="p-3 border-b border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Acceptance Criteria</div>
            <pre className="text-[11px] text-white/70 whitespace-pre-wrap font-mono">{feature.acceptance_criteria}</pre>
          </div>
        )}

        <div className="p-3">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Activity</div>
          <div className="space-y-2">
            {loadingComments ? (
              <div className="flex items-center gap-2 py-2">
                <div className="h-3 w-3 border border-white/20 border-t-purple-400 rounded-full animate-spin" />
                <span className="text-[10px] text-white/30">Loading...</span>
              </div>
            ) : comments.length === 0 ? (
              <p className="text-[11px] text-white/30 py-2">No activity yet</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <span className="text-sm flex-shrink-0">{comment.author_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-medium text-white/80">{comment.author}</span>
                      <span className="text-[9px] text-white/30">{new Date(comment.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[11px] text-white/60 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 p-3 border-t border-white/10">
        <div className="flex gap-2">
          <Input placeholder="Add comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendComment()} className="flex-1 h-8 text-xs bg-white/5 border-white/10" />
          <Button size="sm" onClick={handleSendComment} className="h-8 w-8 p-0"><Send className="h-3 w-3" /></Button>
        </div>
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
}: {
  column: typeof columns[0]
  features: Feature[]
  agents: Agent[]
  onFeatureClick: (feature: Feature) => void
  onStatusChange: (featureId: string, status: Feature['status']) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const Icon = column.icon
  const columnFeatures = features.filter(f => f.status === column.id)

  return (
    <div className="flex-1 min-w-[180px] max-w-[220px]">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Icon className={cn("h-3 w-3", column.color)} />
        <h3 className="text-[11px] font-medium text-white/80">{column.label}</h3>
        <span className="text-[10px] text-white/30 bg-white/5 px-1 rounded">{columnFeatures.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "space-y-1.5 min-h-[100px] rounded-md p-1 transition-all",
          isOver && "bg-purple-400/5 ring-1 ring-purple-400/20"
        )}
      >
        <SortableContext items={columnFeatures.map(f => f.id)} strategy={verticalListSortingStrategy}>
          {columnFeatures.map((feature) => (
            <SortableFeatureCard
              key={feature.id}
              feature={feature}
              agents={agents}
              onClick={() => onFeatureClick(feature)}
              onStatusChange={(status) => onStatusChange(feature.id, status)}
            />
          ))}
        </SortableContext>

        {columnFeatures.length === 0 && !isOver && (
          <div className="p-2 rounded border border-dashed border-white/10 text-center">
            <p className="text-[10px] text-white/20">Empty</p>
          </div>
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
  const isDemoMode = !supabase

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  // ─── Load data ───
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
    } finally {
      setIsLoading(false)
    }
  }, [isDemoMode])

  useEffect(() => { loadData() }, [loadData])

  // ─── Realtime subscription ───
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('features-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'features' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setFeatures(prev => [payload.new as Feature, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Feature
          setFeatures(prev => prev.map(f => f.id === updated.id ? updated : f))
          // Also update the detail panel if open
          setSelectedFeature(prev => prev && prev.id === updated.id ? updated : prev)
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as { id: string }
          setFeatures(prev => prev.filter(f => f.id !== old.id))
        }
      })
      .subscribe()

    return () => { supabase!.removeChannel(channel) }
  }, [])

  // ─── Status change handler ───
  const handleStatusChange = useCallback(async (featureId: string, newStatus: Feature['status']) => {
    // Optimistic update
    setFeatures(prev => prev.map(f => f.id === featureId ? { ...f, status: newStatus, updated_at: new Date().toISOString() } : f))
    setSelectedFeature(prev => prev && prev.id === featureId ? { ...prev, status: newStatus } : prev)

    if (supabase) {
      try {
        const { error } = await supabase.from('features').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', featureId)
        if (error) throw error
      } catch (err) {
        console.error('Error updating status:', err)
        loadData() // Revert on error
      }
    }
  }, [loadData])

  // ─── Drag handlers ───
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const featureId = active.id as string
    const overId = over.id as string

    // Check if dropped on a column
    const targetColumn = columns.find(c => c.id === overId)
    if (targetColumn) {
      const feature = features.find(f => f.id === featureId)
      if (feature && feature.status !== targetColumn.id) {
        handleStatusChange(featureId, targetColumn.id as Feature['status'])
      }
      return
    }

    // Dropped on another card — find which column that card is in
    const targetFeature = features.find(f => f.id === overId)
    if (targetFeature) {
      const feature = features.find(f => f.id === featureId)
      if (feature && feature.status !== targetFeature.status) {
        handleStatusChange(featureId, targetFeature.status)
      }
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
          <p className="text-xs text-white/50">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Feature Board</h2>
          <p className="text-[11px] text-white/40">Track requests and progress</p>
        </div>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowCreate(true)}>
          <Plus className="h-3 w-3" />
          New
        </Button>
      </div>

      {isDemoMode && (
        <div className="px-2 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 text-yellow-400" />
            <p className="text-[10px] text-yellow-400/80">Demo mode — Connect Supabase for live data</p>
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

      {/* Board with DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              features={filteredFeatures}
              agents={agents}
              onFeatureClick={setSelectedFeature}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>

        <DragOverlay>
          {activeFeature ? <FeatureCardPlain feature={activeFeature} agents={agents} /> : null}
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
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
