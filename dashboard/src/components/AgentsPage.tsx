"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot,
  X,
  ChevronDown,
  CheckCircle2,
  Clock,
  Pencil,
  Save,
  FileText,
  Plus,
  Rocket,
  AlertTriangle,
  Loader2,
  RefreshCw,
  History,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAgents, buildAgentTree, getChildAgents, Agent } from "@/hooks/useAgents"
import { useMemoryLogs, DailyMemoryLog } from "@/hooks/useMemoryLogs"

const departments = ["Platform", "Sales", "Innovation", "Support", "Warranty", "Construction"]

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
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center p-4 rounded-xl border transition-all text-left",
        isSelected
          ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_20px_-5px_rgba(147,51,234,0.3)]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
        isRoot ? "min-w-[200px]" : "min-w-[160px]"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl mb-3",
          isRoot ? "w-14 h-14" : "w-12 h-12",
          "bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20"
        )}
      >
        {agent.emoji ? (
          <span className={cn(isRoot ? "text-2xl" : "text-xl")}>{agent.emoji}</span>
        ) : (
          <Bot className={cn("text-blue-400", isRoot ? "h-7 w-7" : "h-6 w-6")} />
        )}
      </div>
      <p className={cn("font-semibold text-white", isRoot ? "text-lg" : "text-sm")}>
        {agent.id}
      </p>
      <p className="text-xs text-white/50 mt-0.5 text-center line-clamp-2">{agent.role}</p>
      <div className="flex items-center gap-2 mt-2">
        <Badge
          variant={agent.status === "active" ? "success" : "warning"}
          className="text-[10px] px-1.5 py-0"
        >
          {agent.status === "active" ? (
            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
          ) : (
            <Clock className="h-2.5 w-2.5 mr-0.5" />
          )}
          {agent.status}
        </Badge>
      </div>
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
      className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-white/20 bg-white/[0.01] hover:border-purple-500/50 hover:bg-purple-500/5 transition-all min-w-[160px] min-h-[140px]"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 mb-3">
        <Plus className="h-6 w-6 text-white/40" />
      </div>
      <p className="text-sm font-medium text-white/40">Add Agent</p>
    </motion.button>
  )
}

// New Agent Panel
function NewAgentPanel({ onClose }: { onClose: () => void }) {
  const [agentId, setAgentId] = useState("")
  const [agentName, setAgentName] = useState("")
  const [agentRole, setAgentRole] = useState("")
  const [agentDept, setAgentDept] = useState("Sales")
  const [launching, setLaunching] = useState(false)

  const handleLaunch = async () => {
    setLaunching(true)
    // TODO: Create agent in Supabase
    await new Promise((r) => setTimeout(r, 1500))
    setLaunching(false)
    onClose()
  }

  const isValid = agentId && agentName && agentRole && agentDept

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-0 top-0 h-full w-full max-w-lg border-l border-white/10 bg-black/95 backdrop-blur-xl z-50 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20">
            <Plus className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">New Agent</h2>
            <p className="text-xs text-white/40">Configure and launch</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">Agent ID</label>
          <Input
            placeholder="HBx_XX1"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          />
          <p className="text-xs text-white/40">Unique identifier (e.g., HBx_WR1 for Warranty)</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">Display Name</label>
          <Input
            placeholder="Agent name"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">Role</label>
          <Input
            placeholder="What does this agent do?"
            value={agentRole}
            onChange={(e) => setAgentRole(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">Department</label>
          <div className="grid grid-cols-2 gap-2">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setAgentDept(dept)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  agentDept === dept
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                )}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-xs text-white/40 mb-2">Files to be created:</p>
          <div className="flex flex-wrap gap-2">
            {["SOUL.md", "IDENTITY.md", "AGENTS.md", "TOOLS.md", "MEMORY.md", "HEARTBEAT.md", "USER.md"].map((file) => (
              <span key={file} className="px-2 py-1 rounded bg-white/5 text-xs text-white/60">
                {file}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-6">
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

// Memory Logs Component
function MemoryLogsPanel({ agentId }: { agentId: string }) {
  const { logs, loading, error, refresh } = useMemoryLogs(agentId)

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-4 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <Button variant="ghost" size="sm" onClick={refresh} className="mt-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full">
        <History className="h-12 w-12 text-white/20 mb-4" />
        <p className="text-white/40">No memory logs yet</p>
        <p className="text-white/30 text-sm mt-1">New memories will appear here</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-auto">
      {logs.map((day) => (
        <div key={day.date}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-medium text-white">{day.date}</h3>
            <span className="text-xs text-white/40">({day.entries.length} entries)</span>
          </div>
          <div className="space-y-2 pl-6 border-l border-white/10">
            {day.entries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg bg-white/[0.02] border border-white/5"
              >
                <p className="text-sm text-white/70">{entry.content}</p>
                <p className="text-xs text-white/30 mt-2">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Agent Detail Panel Component
function AgentDetailPanel({
  agent,
  onClose,
  onSave,
}: {
  agent: Agent
  onClose: () => void
  onSave: (fileName: string, content: string) => Promise<void>
}) {
  const [activeTab, setActiveTab] = useState(agent.files[0]?.name || "SOUL")
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [saving, setSaving] = useState(false)

  const currentFile = agent.files.find((f) => f.name === activeTab)

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
      className="fixed right-0 top-0 h-full w-full max-w-2xl border-l border-white/10 bg-black/95 backdrop-blur-xl z-50 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20">
            {agent.emoji ? (
              <span className="text-xl">{agent.emoji}</span>
            ) : (
              <Bot className="h-6 w-6 text-blue-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">{agent.id}</h2>
              <Badge variant={agent.status === "active" ? "success" : "warning"}>
                {agent.status}
              </Badge>
            </div>
            <p className="text-sm text-white/50">{agent.role}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Agent Info */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-white/40">Department:</span>
            <span className="ml-2 text-white">{agent.dept}</span>
          </div>
          <div>
            <span className="text-white/40">Name:</span>
            <span className="ml-2 text-white">{agent.name}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {agent.files.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">No files configured for this agent</p>
              <p className="text-white/30 text-sm mt-1">Add files in Supabase to get started</p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6 pt-4 border-b border-white/5 overflow-x-auto">
              <TabsList className="bg-transparent p-0 h-auto gap-1 flex-wrap">
                {agent.files.map((file) => (
                  <TabsTrigger
                    key={file.name}
                    value={file.name}
                    className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 px-3 py-1.5 text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1.5" />
                    {file.name}.md
                  </TabsTrigger>
                ))}
                <TabsTrigger
                  value="__memory_logs__"
                  className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 px-3 py-1.5 text-xs"
                >
                  <History className="h-3 w-3 mr-1.5" />
                  Memory Logs
                </TabsTrigger>
              </TabsList>
            </div>

            {agent.files.map((file) => (
              <TabsContent
                key={file.name}
                value={file.name}
                className="flex-1 overflow-hidden flex flex-col m-0"
              >
                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-2 border-b border-white/5">
                  <span className="text-xs text-white/40">
                    {file.name}.md
                  </span>
                  {isEditing && activeTab === file.name ? (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancel}
                        className="h-7 text-xs text-white/60"
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">
                        {saving ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        Save to DB
                      </Button>
                    </div>
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

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                  {isEditing && activeTab === file.name ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/80 font-mono resize-none focus:outline-none focus:border-purple-500/50"
                    />
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-white/70 font-mono leading-relaxed">
                        {file.content}
                      </pre>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
            
            {/* Memory Logs Tab */}
            <TabsContent
              value="__memory_logs__"
              className="flex-1 overflow-hidden flex flex-col m-0"
            >
              <div className="flex items-center justify-between px-6 py-2 border-b border-white/5">
                <span className="text-xs text-white/40">Daily Memory Logs</span>
                <span className="text-xs text-white/30">Source: Supabase memory_logs</span>
              </div>
              <MemoryLogsPanel agentId={agent.id} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </motion.div>
  )
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="pt-8 flex flex-col items-center">
      <div className="w-[200px] h-[160px] rounded-xl bg-white/5 animate-pulse" />
      <div className="w-px h-8 bg-white/10 mt-4" />
      <div className="flex gap-4 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-[160px] h-[140px] rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

// Error State
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="pt-8 flex flex-col items-center justify-center">
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center max-w-md">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Failed to load agents</h3>
        <p className="text-white/60 text-sm mb-4">{message}</p>
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  )
}

// Main Agents Page
export default function AgentsPage() {
  const { agents, loading, error, refresh, updateAgentFile } = useAgents()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showNewAgent, setShowNewAgent] = useState(false)

  const rootAgent = buildAgentTree(agents)
  const childAgents = getChildAgents(agents)

  const handleSaveFile = async (fileName: string, content: string) => {
    if (!selectedAgent) return
    await updateAgentFile(selectedAgent.id, fileName, content)
    // Update selected agent's local state
    setSelectedAgent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        files: prev.files.map((f) =>
          f.name === fileName ? { ...f, content } : f
        ),
      }
    })
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return <ErrorState message={error} onRetry={refresh} />
  }

  if (!rootAgent) {
    return (
      <div className="pt-8 flex flex-col items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <Bot className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No agents found</h3>
          <p className="text-white/60 text-sm">Create HBx agent in Supabase to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-8">
      {/* Org Chart */}
      <div className="relative">
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

          {/* Child Agents */}
          {childAgents.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {/* Horizontal connector */}
              <div className="absolute w-[calc(100%-200px)] max-w-xl h-px bg-white/10 -mt-6 left-1/2 -translate-x-1/2" />
              
              {childAgents.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-4 bg-white/10 -mt-2 mb-2" />
                  <AgentCard
                    agent={child}
                    onClick={() => setSelectedAgent(child)}
                    isSelected={selectedAgent?.id === child.id}
                  />
                </div>
              ))}
              
              {/* Add Agent Card */}
              <div className="flex flex-col items-center">
                <div className="w-px h-4 bg-white/10 -mt-2 mb-2 opacity-0" />
                <AddAgentCard onClick={() => setShowNewAgent(true)} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data source indicator */}
      <div className="mt-8 text-center">
        <p className="text-white/20 text-xs">
          Live data from Supabase • {agents.length} agents
        </p>
      </div>

      {/* Panels */}
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
              onSave={handleSaveFile}
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
      </AnimatePresence>
    </div>
  )
}
