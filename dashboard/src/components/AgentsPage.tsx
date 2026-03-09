"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot,
  X,
  ChevronDown,
  ChevronRight,
  Clock,
  Pencil,
  Save,
  FileText,
  Loader2,
  Plus,
  Rocket,
  Globe,
  MessageSquare,
  Activity,
  Brain,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ChatPanel } from "@/components/chat"
import { ActivityFeed, ActivityItemData } from "@/components/activity"
import { AgentStatusBadge, useAgentStatus, DeploymentStatusBadge } from "@/components/agents"
import { supabase } from "@/lib/supabase"
import { useMemoryLogs } from "@/hooks/useMemoryLogs"
import { OrchestratorPanel } from "@/components/orchestrator"
import { Network } from "lucide-react"

// Agent data structure
interface AgentFile {
  name: string
  content: string
}

interface Agent {
  id: string
  name: string
  role: string
  dept: string
  status: "active" | "deploying" | "standby"
  emoji?: string
  description?: string
  capabilities?: string[]
  children?: Agent[]
}

// Mapping between DB column names and file tab names
const FILE_DB_MAP: Record<string, string> = {
  "SOUL": "soul_md",
  "AGENTS": "agents_md",
  "IDENTITY": "identity_md",
  "TOOLS": "tools_md",
  "HEARTBEAT": "heartbeat_md",
  "USER": "user_md",
  "MEMORY": "memory_md"
}

// Reverse mapping
const DB_FILE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(FILE_DB_MAP).map(([k, v]) => [v, k])
)

// Standard file tabs for all agents
const AGENT_FILE_TABS = ["SOUL", "AGENTS", "IDENTITY", "TOOLS", "HEARTBEAT", "USER", "MEMORY"]

const departments = ["Platform", "Sales", "Innovation", "Support", "Warranty", "Construction", "Start Up", "Settlement", "Design", "QA"]

// Department color mapping
const DEPT_COLORS: Record<string, string> = {
  Platform: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Sales: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Innovation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Support: "bg-green-500/10 text-green-400 border-green-500/20",
  Warranty: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  Construction: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Start Up": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Settlement: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  Design: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  QA: "bg-lime-500/10 text-lime-400 border-lime-500/20",
}

function getDeptColor(dept: string) {
  return DEPT_COLORS[dept] ?? "bg-white/5 text-white/40 border-white/10"
}

function formatLastActive(iso?: string): string {
  if (!iso) return "Never"
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Active now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  } catch {
    return "Unknown"
  }
}

// Agent Card Component
function AgentCard({
  agent,
  onClick,
  isSelected,
  isRoot = false,
}: {
  agent: Agent
  onClick: () => void
  isSelected: boolean
  isRoot?: boolean
}) {
  const gatewayStatus = useAgentStatus(agent.id.toLowerCase())

  // Get agent emoji
  const getAgentEmoji = (a: Agent) => {
    if (a.emoji) return a.emoji
    const emojiMap: Record<string, string> = {
      'HBx': '🧠', 'HBx_SL1': '🏠', 'HBx_SL2': '🔍', 'HBx_SK1': '🛠️',
      'HBx_IN1': '📐', 'HBx_IN2': '🏭', 'HBx_IN3': '🔬', 'HBx_SP1': '🛟',
    }
    return emojiMap[a.id] || '🤖'
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start p-4 rounded-xl border transition-all text-left",
        isSelected
          ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_20px_-5px_rgba(147,51,234,0.3)]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
        isRoot ? "min-w-[220px]" : "min-w-[180px] max-w-[220px]"
      )}
    >
      {/* Gateway Status Badge - Top Right */}
      <div className="absolute top-2 right-2">
        <AgentStatusBadge status={gatewayStatus} size="sm" />
      </div>

      {/* Emoji + ID Row */}
      <div className="flex items-center gap-3 mb-2 w-full pr-8">
        <div className={cn(
          "flex items-center justify-center rounded-xl shrink-0",
          isRoot ? "w-12 h-12" : "w-10 h-10",
          "bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20"
        )}>
          <span className={cn(isRoot ? "text-2xl" : "text-lg")}>{getAgentEmoji(agent)}</span>
        </div>
        <div className="min-w-0">
          <p className={cn("font-semibold text-white leading-tight", isRoot ? "text-base" : "text-sm")}>
            {agent.id}
          </p>
          <p className="text-[10px] text-white/40 truncate mt-0.5">{agent.role}</p>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2 mb-2 w-full">
          {agent.description}
        </p>
      )}

      {/* Department + Status */}
      <div className="flex items-center gap-1.5 flex-wrap mt-auto w-full">
        <Badge variant="outline" className={cn("text-[10px] border px-1.5 py-0", getDeptColor(agent.dept))}>
          {agent.dept}
        </Badge>
        <DeploymentStatusBadge status={agent.status} size="sm" />
      </div>

      {/* Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 w-full">
          {agent.capabilities.slice(0, 3).map((cap) => (
            <span key={cap} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-white/40 border border-white/5">
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-white/30">
              +{agent.capabilities.length - 3}
            </span>
          )}
        </div>
      )}
    </motion.button>
  )
}

// Add Agent Card
function AddAgentCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative flex flex-col items-center p-4 rounded-xl border border-dashed border-white/20 hover:border-white/40 transition-all text-left min-w-[160px] bg-white/[0.01] hover:bg-white/[0.03]"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-3 bg-white/5">
        <Plus className="h-6 w-6 text-white/40" />
      </div>
      <p className="text-sm font-semibold text-white/60">Add Agent</p>
      <p className="text-xs text-white/30 mt-0.5">Create new</p>
    </motion.button>
  )
}

// New Agent Panel
function NewAgentPanel({ onClose }: { onClose: () => void }) {
  const [agentId, setAgentId] = useState("")
  const [agentName, setAgentName] = useState("")
  const [agentRole, setAgentRole] = useState("")
  const [agentDept, setAgentDept] = useState("")
  const [launching, setLaunching] = useState(false)

  const isValid = agentId && agentName && agentRole && agentDept

  const handleLaunch = async () => {
    if (!isValid) return
    setLaunching(true)
    // TODO: Implement actual agent creation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setLaunching(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-0 top-0 h-full w-full max-w-2xl border-l border-white/10 bg-black/95 backdrop-blur-xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20">
            <Bot className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Create New Agent</h2>
            <p className="text-sm text-white/50">Configure and launch</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-2 block">Agent ID</label>
            <Input
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="HBx_XX1"
              className="bg-white/5 border-white/10"
            />
            <p className="text-xs text-white/40 mt-1">Format: HBx_[DEPT][NUM]</p>
          </div>

          <div>
            <label className="text-sm text-white/70 mb-2 block">Agent Name</label>
            <Input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Agent Name"
              className="bg-white/5 border-white/10"
            />
          </div>

          <div>
            <label className="text-sm text-white/70 mb-2 block">Role</label>
            <Input
              value={agentRole}
              onChange={(e) => setAgentRole(e.target.value)}
              placeholder="What does this agent do?"
              className="bg-white/5 border-white/10"
            />
          </div>

          <div>
            <label className="text-sm text-white/70 mb-2 block">Department</label>
            <select
              value={agentDept}
              onChange={(e) => setAgentDept(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
            >
              <option value="">Select department...</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-xs text-white/40 mb-2">Files to be created:</p>
          <div className="flex flex-wrap gap-2">
            {AGENT_FILE_TABS.map((file) => (
              <span key={file} className="px-2 py-1 rounded bg-white/5 text-xs text-white/60">
                {file}.md
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-white/10 p-6">
        <Button
          className="w-full"
          disabled={!isValid || launching}
          onClick={handleLaunch}
        >
          {launching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Launching...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4 mr-2" />
              Launch Agent
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}

// File Panel Component (for global knowledge, templates, etc.)
function FilePanel({
  title,
  subtitle,
  icon: Icon,
  files,
  onClose,
  onSave,
}: {
  title: string
  subtitle: string
  icon: React.ElementType
  files: AgentFile[]
  onClose: () => void
  onSave: (fileName: string, content: string) => Promise<void>
}) {
  const [activeFile, setActiveFile] = useState(files[0]?.name || "")
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [saving, setSaving] = useState(false)

  const currentFile = files.find((f) => f.name === activeFile)

  const handleEdit = () => {
    if (currentFile) {
      setEditContent(currentFile.content)
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!currentFile) return
    setSaving(true)
    try {
      await onSave(currentFile.name, editContent)
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to save:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditContent("")
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-0 top-0 h-full w-full max-w-2xl border-l border-white/10 bg-black/95 backdrop-blur-xl z-50 flex flex-col"
    >
      {/* Header - Fixed */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20">
            <Icon className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-sm text-white/50">{subtitle}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs - Fixed with horizontal scroll */}
      <div className="flex-shrink-0 px-6 pt-4 border-b border-white/5">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-2">
          <div className="flex gap-1 min-w-max">
            {files.map((file) => (
              <button
                key={file.name}
                onClick={() => {
                  setActiveFile(file.name)
                  setIsEditing(false)
                }}
                className={cn(
                  "flex items-center px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap",
                  activeFile === file.name
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-white/50 hover:text-white/70 hover:bg-white/5"
                )}
              >
                <FileText className="h-3 w-3 mr-1.5" />
                {file.name}.md
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar - Fixed */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-2 border-b border-white/5">
        <span className="text-xs text-white/40">
          {activeFile}.md
        </span>
        {isEditing ? (
          <Button size="sm" onClick={handleSave} className="h-7 text-xs">
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="h-7 text-xs text-white/60 hover:text-white"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full min-h-[500px] bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/80 font-mono resize-none focus:outline-none focus:border-purple-500/50"
          />
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-white/70 font-mono leading-relaxed">
              {currentFile?.content || "No content"}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// User channel data - maps to Supabase users by email
const chatUsers = [
  { id: 'lance', name: 'Lance Manlove', initials: 'LM', color: 'purple', email: 'lance@schellbrothers.com' },
  { id: 'robl', name: 'Rob Lepard', initials: 'RL', color: 'blue', email: 'rob.lepard@schellbrothers.com' },
  { id: 'robh', name: 'Rob Hoeller', initials: 'RH', color: 'green', email: 'rob@schellbrothers.com' },
]

// Map Supabase user to chat user ID by email
function mapUserToChannelId(userEmail?: string, userMetadata?: Record<string, unknown>): string {
  // Debug: log inputs
  console.log('[AgentsPage] mapUserToChannelId called with:', { userEmail, userMetadata })
  
  // 1. Check user_metadata.channel_id (override if set)
  if (userMetadata?.channel_id && typeof userMetadata.channel_id === 'string') {
    const channelId = userMetadata.channel_id.toLowerCase()
    if (chatUsers.find(u => u.id === channelId)) {
      console.log('[AgentsPage] Matched by channel_id:', channelId)
      return channelId
    }
  }
  
  // 2. Match by exact email (primary method)
  if (userEmail) {
    const emailLower = userEmail.toLowerCase()
    console.log('[AgentsPage] Checking email:', emailLower)
    console.log('[AgentsPage] Against chatUsers:', chatUsers.map(u => u.email.toLowerCase()))
    const match = chatUsers.find(u => u.email.toLowerCase() === emailLower)
    if (match) {
      console.log('[AgentsPage] Matched user by email:', match.id)
      return match.id
    }
  }
  
  // 3. Default to first user (Lance)
  console.warn('[AgentsPage] Could not map user to channel, defaulting to lance:', { userEmail })
  return chatUsers[0].id
}

// Agent Detail Panel - Full Page Modal with Chat, Files, Status, etc.
function AgentDetailPanel({
  agent,
  onClose,
  defaultUserId,
}: {
  agent: Agent
  onClose: () => void
  defaultUserId?: string
}) {
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'cron' | 'memory'>('chat')
  const [activeUser, setActiveUser] = useState(defaultUserId || chatUsers[0].id)
  const [activeFile, setActiveFile] = useState("SOUL")
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Agent files state
  const [agentFiles, setAgentFiles] = useState<Record<string, string>>({})
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  
  // Daily memory logs
  const { logs: memoryLogs, loading: memoryLogsLoading } = useMemoryLogs(agent.id)

  // Editor state
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Read-only mode when viewing someone else's chat (admin view)
  const isReadOnly = activeUser !== defaultUserId

  // Fetch agent files from Supabase when panel opens
  useEffect(() => {
    const fetchAgentFiles = async () => {
      if (!supabase) {
        setFilesError("Database not configured (demo mode)")
        return
      }

      setIsLoadingFiles(true)
      setFilesError(null)

      try {
        const { data, error } = await supabase
          .from('agents')
          .select('soul_md, agents_md, identity_md, tools_md, heartbeat_md, user_md, memory_md')
          .eq('id', agent.id)
          .single()

        if (error) throw error

        if (data) {
          // Map DB columns to file names
          const files: Record<string, string> = {}
          Object.entries(FILE_DB_MAP).forEach(([fileName, dbColumn]) => {
            files[fileName] = data[dbColumn as keyof typeof data] || `# ${fileName}\n\nNo content available.`
          })
          setAgentFiles(files)
        }
      } catch (err) {
        console.error('Error fetching agent files:', err)
        setFilesError(err instanceof Error ? err.message : 'Failed to load files')
        
        // Fallback to empty content
        const fallbackFiles: Record<string, string> = {}
        AGENT_FILE_TABS.forEach(tab => {
          fallbackFiles[tab] = `# ${tab}\n\nNo content available.`
        })
        setAgentFiles(fallbackFiles)
      } finally {
        setIsLoadingFiles(false)
      }
    }

    fetchAgentFiles()
  }, [agent.id])

  const currentFileContent = agentFiles[activeFile] || ""

  const handleEdit = () => {
    setEditContent(currentFileContent)
    setIsEditing(true)
    setSaveMessage(null)
  }

  const handleSave = async () => {
    if (!supabase) {
      setSaveMessage({ type: 'error', text: 'Database not configured' })
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      // Map file name to DB column
      const dbColumn = FILE_DB_MAP[activeFile]
      if (!dbColumn) {
        throw new Error('Invalid file name')
      }

      const { error } = await supabase
        .from('agents')
        .update({ [dbColumn]: editContent })
        .eq('id', agent.id)

      if (error) throw error

      // Update local state
      setAgentFiles(prev => ({
        ...prev,
        [activeFile]: editContent
      }))
      
      setIsEditing(false)
      setSaveMessage({ type: 'success', text: 'Saved successfully' })
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error('Error saving file:', err)
      setSaveMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Failed to save' 
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Get agent emoji based on ID
  const getAgentEmoji = (agent: Agent) => {
    if (agent.emoji) return agent.emoji
    
    const emojiMap: Record<string, string> = {
      'HBx': '🧠',
      'HBx_SL1': '🏠',
      'HBx_SL2': '🔍',
      'HBx_SK1': '🛠️',
      'HBx_IN1': '📐',
      'HBx_IN2': '🏭',
      'HBx_IN3': '🔬',
      'HBx_SP1': '🛟',
    }
    return emojiMap[agent.id] || '🤖'
  }

  const tabs = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'files' as const, label: 'Files', icon: FileText },
    { id: 'cron' as const, label: 'Cron', icon: Clock },
    { id: 'memory' as const, label: 'Memory', icon: Brain },
  ]

  // Filter out MEMORY from regular files (it has its own tab)
  const editableFileTabs = AGENT_FILE_TABS.filter(f => f !== 'MEMORY')

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "fixed top-0 right-0 h-full bg-black/98 border-l border-white/10 backdrop-blur-xl z-50 flex flex-col overflow-hidden transition-all duration-300",
        "w-full",
        isExpanded 
          ? "md:w-full md:border-l-0 md:rounded-none" 
          : "md:w-[600px] lg:w-[700px] md:rounded-l-2xl"
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20">
            <span className="text-xl">{getAgentEmoji(agent)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">{agent.id}</h2>
              <DeploymentStatusBadge status={agent.status} size="md" />
              {isReadOnly && (
                <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400/30">
                  View Only
                </Badge>
              )}
            </div>
            <p className="text-sm text-white/50">{agent.role} · {agent.dept}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex"
            title={isExpanded ? "Collapse panel" : "Expand panel"}
          >
            {isExpanded ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5 -rotate-90" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-6 pt-4 border-b border-white/5">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setIsEditing(false)
                  setSaveMessage(null)
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all",
                  activeTab === tab.id
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-white/50 hover:text-white/70 hover:bg-white/5"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* User Channel Selector */}
            <div className="flex-shrink-0 px-6 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 mr-2">Channels:</span>
                {chatUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setActiveUser(user.id)}
                    title={user.name}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                      activeUser === user.id
                        ? `bg-${user.color}-500/20 text-${user.color}-300 ring-2 ring-${user.color}-500/50`
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    )}
                  >
                    {user.initials}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Chat Panel */}
            <div className="flex-1 min-h-0">
              <ChatPanel 
                agentId={agent.id}
                agentName={agent.name}
                agentEmoji={getAgentEmoji(agent)}
                userId={activeUser}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* File Tabs */}
            <div className="flex-shrink-0 px-6 pt-3 border-b border-white/5">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-2">
                <div className="flex gap-1 min-w-max">
                  {editableFileTabs.map((fileName) => (
                    <button
                      key={fileName}
                      onClick={() => {
                        setActiveFile(fileName)
                        setIsEditing(false)
                        setSaveMessage(null)
                      }}
                      className={cn(
                        "flex items-center px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap",
                        activeFile === fileName
                          ? "bg-purple-500/20 text-purple-300"
                          : "text-white/50 hover:text-white/70 hover:bg-white/5"
                      )}
                    >
                      <FileText className="h-3 w-3 mr-1.5" />
                      {fileName}.md
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-2 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40">
                  {activeFile}.md
                </span>
                {saveMessage && (
                  <span className={cn(
                    "text-xs",
                    saveMessage.type === 'success' ? "text-green-400" : "text-red-400"
                  )}>
                    {saveMessage.text}
                  </span>
                )}
              </div>
              {isEditing ? (
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  className="h-7 text-xs"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-7 text-xs text-white/60 hover:text-white"
                  disabled={isLoadingFiles}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {/* File Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingFiles ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-white/40">Loading files...</p>
                  </div>
                </div>
              ) : filesError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <p className="text-sm text-red-400 mb-2">Failed to load files</p>
                    <p className="text-xs text-white/40">{filesError}</p>
                  </div>
                </div>
              ) : isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[500px] bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/80 font-mono resize-none focus:outline-none focus:border-purple-500/50"
                />
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-white/70 font-mono leading-relaxed">
                    {currentFileContent}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cron Tab */}
        {activeTab === 'cron' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <h4 className="text-sm font-medium text-white mb-3">Scheduled Tasks</h4>
              <p className="text-xs text-white/40">No scheduled tasks configured.</p>
            </div>
          </div>
        )}

        {/* Memory Tab */}
        {activeTab === 'memory' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h4 className="text-sm font-medium text-white mb-3">Memory Overview</h4>
                {isLoadingFiles ? (
                  <p className="text-xs text-white/40">Loading...</p>
                ) : (
                  <pre className="text-xs text-white/60 font-mono whitespace-pre-wrap">
                    {agentFiles['MEMORY'] || 'No memory data available.'}
                  </pre>
                )}
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h4 className="text-sm font-medium text-white mb-3">Daily Logs</h4>
                {memoryLogsLoading ? (
                  <p className="text-xs text-white/40">Loading logs...</p>
                ) : memoryLogs.length === 0 ? (
                  <p className="text-xs text-white/40">No daily logs recorded yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {memoryLogs.map((day) => (
                      <div key={day.date} className="space-y-1">
                        <div className="text-[10px] text-white/50 uppercase tracking-wider font-medium sticky top-0 bg-black/80 py-0.5">
                          {new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        {day.entries.map((entry) => (
                          <div key={entry.id} className="pl-2 border-l border-white/10">
                            <div className="text-[9px] text-white/30">
                              {new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <pre className="text-[11px] text-white/60 font-mono whitespace-pre-wrap leading-relaxed">
                              {entry.content}
                            </pre>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Department Group Component
function DeptGroup({
  dept,
  agents,
  selectedAgentId,
  onSelectAgent,
  onAddAgent,
  showAdd,
}: {
  dept: string
  agents: Agent[]
  selectedAgentId: string | null
  onSelectAgent: (agent: Agent) => void
  onAddAgent: () => void
  showAdd: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
      {/* Dept header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-all"
      >
        <ChevronRight className={cn(
          "h-3.5 w-3.5 text-white/30 transition-transform",
          !collapsed && "rotate-90"
        )} />
        <Badge variant="outline" className={cn("text-xs border", getDeptColor(dept))}>
          {dept}
        </Badge>
        <span className="text-xs text-white/30">{agents.length} agent{agents.length !== 1 ? "s" : ""}</span>
      </button>

      {/* Agents */}
      {!collapsed && (
        <div className="px-4 pb-4 flex flex-wrap gap-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => onSelectAgent(agent)}
              isSelected={selectedAgentId === agent.id}
            />
          ))}
          {showAdd && <AddAgentCard onClick={onAddAgent} />}
        </div>
      )}
    </div>
  )
}

// Props interface for AgentsPage
interface AgentsPageProps {
  userEmail?: string
  userMetadata?: Record<string, unknown>
}

// Main Agents Page
export default function AgentsPage({ userEmail, userMetadata }: AgentsPageProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showNewAgent, setShowNewAgent] = useState(false)
  const [showGlobalKnowledge, setShowGlobalKnowledge] = useState(false)
  const [showActivityFeed, setShowActivityFeed] = useState(true)
  const [viewMode, setViewMode] = useState<'agents' | 'network'>('agents')
  const currentUserId = mapUserToChannelId(userEmail, userMetadata)

  // Agent tree state
  const [agentTree, setAgentTree] = useState<Agent>({
    id: "HBx",
    name: "HBx",
    role: "Master Orchestrator",
    dept: "Platform",
    status: "active",
    emoji: "🧠",
    children: [
      {
        id: "HBx_SL1",
        name: "Schellie",
        role: "Digital Online Sales Counselor",
        dept: "Sales",
        status: "active",
        emoji: "🏠",
      },
      {
        id: "HBx_SL2",
        name: "Competitive Intel",
        role: "Market Intelligence Analyst",
        dept: "Sales",
        status: "deploying",
        emoji: "🔍",
      },
      {
        id: "HBx_SK1",
        name: "Skill Builder",
        role: "Agent Configuration Designer",
        dept: "Platform",
        status: "deploying",
        emoji: "🛠️",
      },
      {
        id: "HBx_IN1",
        name: "Architectural AI",
        role: "Design Assistance & Visualization",
        dept: "Innovation",
        status: "standby",
        emoji: "📐",
      },
      {
        id: "HBx_IN2",
        name: "Process Optimizer",
        role: "Construction Workflow Intelligence",
        dept: "Innovation",
        status: "standby",
        emoji: "🏭",
      },
      {
        id: "HBx_IN3",
        name: "Research Lab",
        role: "Experimental AI & Testing",
        dept: "Innovation",
        status: "standby",
        emoji: "🔬",
      },
      {
        id: "HBx_SP1",
        name: "Support",
        role: "Bug Triage & Platform Maintenance",
        dept: "Support",
        status: "active",
        emoji: "🛟",
      },
    ],
  })

  // Fetch agents from Supabase on mount
  useEffect(() => {
    const fetchAgents = async () => {
      if (!supabase) {
        console.log('[AgentsPage] Supabase not configured, using hardcoded agent tree')
        return
      }

      try {
        const { data, error } = await supabase
          .from('agents')
          .select('id, name, role, description, emoji, status, department_id, capabilities')
          .order('id')

        if (error) throw error

        if (data && data.length > 0) {
          // Find HBx (root)
          const hbx = data.find(a => a.id === 'HBx')
          const children = data.filter(a => a.id !== 'HBx')

          if (hbx) {
            const tree: Agent = {
              id: hbx.id,
              name: hbx.name,
              role: hbx.role,
              dept: "Platform",
              status: (hbx.status as Agent['status']) || "active",
              emoji: hbx.emoji || "🧠",
              description: hbx.description || undefined,
              children: children.map(child => ({
                id: child.id,
                name: child.name,
                role: child.role,
                dept: child.department_id || "Platform",
                status: (child.status as Agent['status']) || "standby",
                emoji: child.emoji || "🤖",
                description: child.description || undefined,
                capabilities: (child.capabilities as string[]) || undefined,
              }))
            }
            setAgentTree(tree)
            console.log('[AgentsPage] Loaded', data.length, 'agents from database')
          }
        }
      } catch (err) {
        console.error('[AgentsPage] Error fetching agents:', err)
        // Keep using hardcoded tree as fallback
      }
    }

    fetchAgents()
  }, [])

  // Handle clicking on an activity item
  const handleActivityClick = (item: ActivityItemData) => {
    const findAgent = (tree: Agent, id: string): Agent | null => {
      if (tree.id.toLowerCase() === id.toLowerCase()) return tree
      if (tree.children) {
        for (const child of tree.children) {
          const found = findAgent(child, id)
          if (found) return found
        }
      }
      return null
    }
    
    const agent = findAgent(agentTree, item.agentId)
    if (agent) {
      setSelectedAgent(agent)
    }
  }

  // Global knowledge files — live from Supabase
  const [globalKnowledgeFiles, setGlobalKnowledgeFiles] = useState<AgentFile[]>([])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from("global_knowledge")
      .select("slug, title, content")
      .order("slug")
      .then(({ data, error }) => {
        if (error || !data) return
        setGlobalKnowledgeFiles(
          data.map((r: { slug: string; title: string; content: string }) => ({
            name: r.slug.toUpperCase().replace(/-/g, "_"),
            content: r.content || `# ${r.title}\n\nNo content yet.`,
          }))
        )
      })
  }, [])

  const handleGlobalKnowledgeSave = useCallback(async (fileName: string, content: string) => {
    if (!supabase) return
    const slug = fileName.toLowerCase().replace(/_/g, "-")
    const { error } = await supabase
      .from("global_knowledge")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("slug", slug)
    if (error) throw error
    // Update local state
    setGlobalKnowledgeFiles(prev =>
      prev.map(f => f.name === fileName ? { ...f, content } : f)
    )
  }, [])

  const rootAgent = agentTree
  const childAgents = agentTree.children ?? []

  // Department grouping for child agents
  const agentsByDept = childAgents.reduce((acc, agent) => {
    const dept = agent.dept || "Other"
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(agent)
    return acc
  }, {} as Record<string, Agent[]>)

  const deptOrder = ["Platform", "Sales", "Innovation", "Support", ...Object.keys(agentsByDept).filter(
    d => !["Platform", "Sales", "Innovation", "Support"].includes(d)
  )]
  const orderedDepts = deptOrder.filter(d => agentsByDept[d]?.length > 0)

  // Stats
  const totalAgents = 1 + childAgents.length
  const activeAgents = [rootAgent, ...childAgents].filter(a => a.status === "active").length
  const deployingAgents = [rootAgent, ...childAgents].filter(a => a.status === "deploying").length

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-8">

        {/* Mission Statement Banner */}
        <div className="px-6 pt-6 pb-0">
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-purple-500/10 px-6 py-5 mb-6">
            {/* Decorative glow */}
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-purple-400/80 mb-1">Mission</p>
                <p className="text-sm text-white/80 leading-relaxed">
                  To bring happiness to ourselves and our homeowners by not only creating exceptional homes and communities but also providing an extraordinary home buying experience.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <Users className="h-4 w-4 text-white/40" />
              <span className="text-sm font-medium text-white">{totalAgents}</span>
              <span className="text-xs text-white/40">Total Agents</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium text-white">{activeAgents}</span>
              <span className="text-xs text-white/40">Active</span>
            </div>
            {deployingAgents > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-sm font-medium text-white">{deployingAgents}</span>
                <span className="text-xs text-white/40">Deploying</span>
              </div>
            )}
            {orderedDepts.map(dept => (
              <div key={dept} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <Badge variant="outline" className={cn("text-[10px] border px-1.5 py-0", getDeptColor(dept))}>
                  {dept}
                </Badge>
                <span className="text-xs text-white/30">{agentsByDept[dept].length}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 space-y-8">
        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('agents')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              viewMode === 'agents'
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "text-white/50 hover:text-white/70 hover:bg-white/5"
            )}
          >
            <Bot className="h-4 w-4" />
            Agents
          </button>
          <button
            onClick={() => setViewMode('network')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              viewMode === 'network'
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "text-white/50 hover:text-white/70 hover:bg-white/5"
            )}
          >
            <Network className="h-4 w-4" />
            Network
          </button>
        </div>

        {/* Conditional Content */}
        {viewMode === 'network' ? (
          <OrchestratorPanel className="h-[calc(100%-5rem)]" />
        ) : (
          <>
      {/* Org Chart */}
      <div className="relative">
        {/* Global Knowledge Base Card - Top of hierarchy */}
        <div className="flex flex-col items-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowGlobalKnowledge(true)}
            className={cn(
              "relative flex flex-col items-center p-4 rounded-xl border transition-all text-left min-w-[160px]",
              showGlobalKnowledge
                ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_20px_-5px_rgba(147,51,234,0.3)]"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
            )}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20">
              <Globe className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-sm font-semibold text-white">Global Knowledge</p>
            <p className="text-xs text-white/50 mt-0.5 text-center">Shared context</p>
          </motion.button>

          {/* Connector to HBx */}
          <div className="flex flex-col items-center">
            <div className="w-px h-6 bg-white/10" />
            <ChevronDown className="h-4 w-4 text-white/20 -mt-1" />
          </div>
        </div>

        {/* Root Agent (HBx) */}
        <div className="flex flex-col items-center">
          <AgentCard
            agent={rootAgent}
            onClick={() => setSelectedAgent(rootAgent)}
            isSelected={selectedAgent?.id === rootAgent.id}
            isRoot
          />

          {/* Connector Line */}
          {childAgents.length > 0 && (
            <div className="flex flex-col items-center">
              <div className="w-px h-8 bg-white/10" />
              <ChevronDown className="h-4 w-4 text-white/20 -mt-1" />
            </div>
          )}
        </div>

        {/* Department Groups */}
        {orderedDepts.length > 0 && (
          <div className="mt-4 space-y-6">
            {orderedDepts.map((dept) => (
              <DeptGroup
                key={dept}
                dept={dept}
                agents={agentsByDept[dept]}
                selectedAgentId={selectedAgent?.id ?? null}
                onSelectAgent={setSelectedAgent}
                onAddAgent={() => setShowNewAgent(true)}
                showAdd={dept === orderedDepts[orderedDepts.length - 1]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Data source indicator */}
      <div className="mt-8 text-center">
        <p className="text-white/20 text-xs">
          Live data from Supabase • {totalAgents} agents
        </p>
      </div>
      </>
      )}
      </div>

      {/* Panels (only for agents view) */}
      {viewMode === 'agents' && (
      <AnimatePresence>
        {selectedAgent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setSelectedAgent(null)}
            />
            <AgentDetailPanel
              agent={selectedAgent}
              onClose={() => setSelectedAgent(null)}
              defaultUserId={currentUserId}
            />
          </>
        )}
        
        {showNewAgent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowNewAgent(false)}
            />
            <NewAgentPanel onClose={() => setShowNewAgent(false)} />
          </>
        )}

        {showGlobalKnowledge && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowGlobalKnowledge(false)}
            />
            <FilePanel
              title="Global Knowledge Base"
              subtitle="Shared company context for all agents"
              icon={Globe}
              files={globalKnowledgeFiles}
              onClose={() => setShowGlobalKnowledge(false)}
              onSave={handleGlobalKnowledgeSave}
            />
          </>
        )}

      </AnimatePresence>
      )}
      </div>

      {/* Activity Feed Side Panel */}
      {showActivityFeed && (
        <div className="w-80 flex-shrink-0 relative">
          <ActivityFeed 
            onItemClick={handleActivityClick}
            className="h-full"
          />
        </div>
      )}

      {/* Toggle Activity Feed Button */}
      <button
        onClick={() => setShowActivityFeed(!showActivityFeed)}
        className={cn(
          "fixed bottom-4 right-4 z-30 p-3 rounded-full transition-all shadow-lg",
          showActivityFeed 
            ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
            : "bg-white/10 text-white/60 hover:bg-white/20"
        )}
        title={showActivityFeed ? "Hide activity feed" : "Show activity feed"}
      >
        <Activity className="h-5 w-5" />
      </button>
    </div>
  )
}
