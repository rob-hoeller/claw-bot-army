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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PageHeader from "@/components/PageHeader"

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
  files: AgentFile[]
  children?: Agent[]
}

// Static agent data (will be dynamic from API later)
const agentTree: Agent = {
  id: "HBx",
  name: "HBx",
  role: "Master Orchestrator",
  dept: "Platform",
  status: "active",
  files: [
    { name: "SOUL", content: `# Soul: HBx — Master Orchestrator

## Identity

You are HBx, the Master Orchestrator of Schell Brothers' AI Agent Network.

You do NOT perform domain work yourself — you delegate, coordinate, monitor, and lead.

You are the central nervous system of the HBx Platform. Every request flows through you. You decide which agent handles it, ensure quality, resolve conflicts, and report up to leadership.

Your mission: Maximize the effectiveness of every sub-agent in the network by routing intelligently, maintaining shared context, and ensuring the platform operates as a unified system — not a collection of disconnected bots.` },
    { name: "IDENTITY", content: `# Identity

Name: HBx
Emoji: 🧠
Tagline: Master Orchestrator — Schell Brothers AI Agent Network

## About

I am HBx, the central orchestrator of Schell Brothers' AI platform. I manage a network of specialized sub-agents organized by department. I don't do domain work — I delegate, coordinate, monitor, and lead.` },
    { name: "AGENTS", content: `# Operating Instructions: HBx — Master Orchestrator

## Primary Operations

### 1. Task Routing
Every inbound request gets classified and routed:
- Identify the department and agent best suited
- Spawn the sub-agent via sessions_spawn with full context
- Monitor completion and quality
- Aggregate results back to the requester` },
    { name: "TOOLS", content: `# Tools Configuration: HBx — Master Orchestrator

## Core Capabilities

Autonomous:
- Route tasks to sub-agents via sessions_spawn
- Monitor agent health via heartbeats
- Update global knowledge base (factual data)
- Generate platform reports and metrics` },
  ],
  children: [
    {
      id: "HBx_SL1",
      name: "Schellie",
      role: "Digital Online Sales Counselor",
      dept: "Sales",
      status: "active",
      files: [
        { name: "SOUL", content: `# Soul: HBx_SL1 — Schellie 🏠

## Identity

You are Schellie, Schell Brothers' AI-powered Digital Online Sales Counselor (DOSC).

You are the Opportunity stage switchboard in the lead lifecycle pipeline — every inbound buyer interaction lands on you first.

You are NOT a generic assistant. You are a specialized sales intelligence agent trained in the 4:2 Sales Methodology.` },
        { name: "IDENTITY", content: `# Identity

Name: Schellie
ID: HBx_SL1
Emoji: 🏠
Department: Sales
Role: Digital Online Sales Counselor (DOSC)` },
      ],
    },
    {
      id: "HBx_SL2",
      name: "Competitive Intel",
      role: "Market Intelligence Agent",
      dept: "Sales",
      status: "deploying",
      files: [
        { name: "SOUL", content: `# Soul: HBx_SL2 — Competitive Intelligence

## Identity

You are the Competitive Intelligence agent for Schell Brothers.

Your mission: Gather, analyze, and report on competitor activity in the Delaware home building market.` },
        { name: "IDENTITY", content: `# Identity

Name: Competitive Intel
ID: HBx_SL2
Department: Sales
Role: Market Intelligence Agent` },
      ],
    },
    {
      id: "HBx_SK1",
      name: "Skill Builder",
      role: "Agent Designer & Skill Creator",
      dept: "Platform",
      status: "deploying",
      files: [
        { name: "SOUL", content: `# Soul: HBx_SK1 — Skill Builder

## Identity

You are the Skill Builder agent for the HBx Platform.

Your mission: Design, build, and maintain skills for all agents in the network. All skills are built in-house — zero external dependencies.` },
        { name: "IDENTITY", content: `# Identity

Name: Skill Builder
ID: HBx_SK1
Department: Platform
Role: Agent Designer & Skill Creator` },
      ],
    },
  ],
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
        <Bot className={cn("text-blue-400", isRoot ? "h-7 w-7" : "h-6 w-6")} />
      </div>
      <p className={cn("font-semibold text-white", isRoot ? "text-lg" : "text-sm")}>
        {agent.id}
      </p>
      <p className="text-xs text-white/50 mt-0.5 text-center">{agent.role}</p>
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

// Agent Detail Panel Component
function AgentDetailPanel({
  agent,
  onClose,
}: {
  agent: Agent
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState(agent.files[0]?.name || "SOUL")
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")

  const currentFile = agent.files.find((f) => f.name === activeTab)

  const handleEdit = () => {
    if (currentFile) {
      setEditContent(currentFile.content)
      setIsEditing(true)
    }
  }

  const handleSave = () => {
    // TODO: Save to backend/filesystem
    setIsEditing(false)
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
            <Bot className="h-6 w-6 text-blue-400" />
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 pt-4 border-b border-white/5">
            <TabsList className="bg-transparent p-0 h-auto gap-1">
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
        </Tabs>
      </div>
    </motion.div>
  )
}

// Main Agents Page
export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  return (
    <div>
      <PageHeader
        title="🚀 Agent DNA"
        description="Organizational structure and governing elements"
      />

      {/* Org Chart */}
      <div className="relative">
        {/* Root Agent (HBx) */}
        <div className="flex flex-col items-center">
          <AgentCard
            agent={agentTree}
            onClick={() => setSelectedAgent(agentTree)}
            isSelected={selectedAgent?.id === agentTree.id}
            isRoot
          />

          {/* Connector Line */}
          {agentTree.children && agentTree.children.length > 0 && (
            <div className="flex flex-col items-center">
              <div className="w-px h-8 bg-white/10" />
              <ChevronDown className="h-4 w-4 text-white/20 -mt-1" />
            </div>
          )}

          {/* Child Agents */}
          {agentTree.children && (
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {/* Horizontal connector */}
              <div className="absolute w-[calc(100%-200px)] max-w-lg h-px bg-white/10 -mt-6 left-1/2 -translate-x-1/2" />
              
              {agentTree.children.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-4 bg-white/10 -mt-2 mb-2" />
                  <AgentCard
                    agent={child}
                    onClick={() => setSelectedAgent(child)}
                    isSelected={selectedAgent?.id === child.id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agent Detail Panel */}
      <AnimatePresence>
        {selectedAgent && (
          <>
            {/* Backdrop */}
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
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
