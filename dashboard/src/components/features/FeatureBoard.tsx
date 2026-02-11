"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Search
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

// Types
interface Feature {
  id: string
  title: string
  description: string | null
  status: 'backlog' | 'planned' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  requested_by: string | null
  assigned_to: string | null
  approved_by: string | null
  labels: string[] | null
  pr_url: string | null
  pr_status: string | null
  created_at: string
}

interface Agent {
  id: string
  name: string
  emoji: string | null
}

// Column configuration
const columns = [
  { id: 'backlog', label: 'Backlog', icon: Lightbulb, color: 'text-gray-400' },
  { id: 'planned', label: 'Planned', icon: Clock, color: 'text-blue-400' },
  { id: 'in_progress', label: 'In Progress', icon: PlayCircle, color: 'text-yellow-400' },
  { id: 'review', label: 'Review', icon: Eye, color: 'text-purple-400' },
  { id: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-400' },
]

const priorityConfig = {
  low: { color: 'bg-gray-500/20 text-gray-400', label: 'Low' },
  medium: { color: 'bg-blue-500/20 text-blue-400', label: 'Medium' },
  high: { color: 'bg-orange-500/20 text-orange-400', label: 'High' },
  urgent: { color: 'bg-red-500/20 text-red-400', label: 'Urgent' },
}

// Demo data for when Supabase isn't connected
const demoFeatures: Feature[] = [
  {
    id: '1',
    title: 'Agent-to-Agent Communication',
    description: 'Enable HBx to spawn and coordinate with sub-agents',
    status: 'in_progress',
    priority: 'high',
    requested_by: 'HBx',
    assigned_to: 'HBx_IN2',
    approved_by: 'Lance',
    labels: ['core', 'infrastructure'],
    pr_url: null,
    pr_status: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Learning Log Dashboard',
    description: 'UI to display agent learning activities and insights',
    status: 'planned',
    priority: 'medium',
    requested_by: 'HBx_IN3',
    assigned_to: null,
    approved_by: null,
    labels: ['ui', 'innovation'],
    pr_url: null,
    pr_status: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Competitive Intel Automation',
    description: 'Auto-scrape competitor pricing and inventory',
    status: 'backlog',
    priority: 'medium',
    requested_by: 'HBx_SL2',
    assigned_to: null,
    approved_by: null,
    labels: ['sales', 'automation'],
    pr_url: null,
    pr_status: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Bug Board Integration',
    description: 'Connect bug tracking with support agent workflow',
    status: 'review',
    priority: 'high',
    requested_by: 'HBx',
    assigned_to: 'HBx_IN2',
    approved_by: 'Lance',
    labels: ['support', 'workflow'],
    pr_url: 'https://github.com/example/pr/19',
    pr_status: 'open',
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'Real-time Activity Feed',
    description: 'Live ticker showing all agent conversations',
    status: 'done',
    priority: 'high',
    requested_by: 'HBx',
    assigned_to: 'HBx_IN2',
    approved_by: 'Lance',
    labels: ['ui', 'monitoring'],
    pr_url: 'https://github.com/example/pr/18',
    pr_status: 'merged',
    created_at: new Date().toISOString(),
  },
]

const demoAgents: Agent[] = [
  { id: 'HBx', name: 'HBx', emoji: '🧠' },
  { id: 'HBx_IN1', name: 'Product Architect', emoji: '📐' },
  { id: 'HBx_IN2', name: 'Code Factory', emoji: '🏭' },
  { id: 'HBx_IN3', name: 'Research Lab', emoji: '🔬' },
  { id: 'HBx_SP1', name: 'Support', emoji: '🛟' },
  { id: 'HBx_SL1', name: 'Schellie', emoji: '🏠' },
  { id: 'HBx_SL2', name: 'Competitive Intel', emoji: '🔍' },
]

// Feature Card Component
function FeatureCard({ feature, agents }: { feature: Feature; agents: Agent[] }) {
  const priority = priorityConfig[feature.priority]
  const assignedAgent = agents.find(a => a.id === feature.assigned_to)
  const requestedAgent = agents.find(a => a.id === feature.requested_by)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-3 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-white leading-tight group-hover:text-purple-300 transition-colors">
          {feature.title}
        </h4>
        <Badge className={cn("text-[10px] flex-shrink-0", priority.color)}>
          {priority.label}
        </Badge>
      </div>

      {/* Description */}
      {feature.description && (
        <p className="text-xs text-white/50 mb-3 line-clamp-2">
          {feature.description}
        </p>
      )}

      {/* Labels */}
      {feature.labels && feature.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {feature.labels.map((label) => (
            <span
              key={label}
              className="px-1.5 py-0.5 text-[10px] rounded bg-white/5 text-white/40"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Requested By */}
          {requestedAgent && (
            <div className="flex items-center gap-1" title={`Requested by ${requestedAgent.name}`}>
              <span className="text-xs">{requestedAgent.emoji}</span>
            </div>
          )}
          
          {/* Arrow if assigned */}
          {requestedAgent && assignedAgent && (
            <ArrowRight className="h-3 w-3 text-white/20" />
          )}
          
          {/* Assigned To */}
          {assignedAgent && (
            <div className="flex items-center gap-1" title={`Assigned to ${assignedAgent.name}`}>
              <span className="text-xs">{assignedAgent.emoji}</span>
              <span className="text-[10px] text-white/40">{assignedAgent.id}</span>
            </div>
          )}
          
          {!assignedAgent && !requestedAgent && (
            <Bot className="h-3 w-3 text-white/20" />
          )}
        </div>

        {/* PR Status */}
        {feature.pr_url && (
          <a
            href={feature.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300"
            onClick={(e) => e.stopPropagation()}
          >
            <GitPullRequest className="h-3 w-3" />
            {feature.pr_status === 'merged' ? 'Merged' : 'PR'}
          </a>
        )}
      </div>
    </motion.div>
  )
}

// Column Component
function Column({ 
  column, 
  features, 
  agents 
}: { 
  column: typeof columns[0]
  features: Feature[]
  agents: Agent[]
}) {
  const Icon = column.icon
  const columnFeatures = features.filter(f => f.status === column.id)

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className={cn("h-4 w-4", column.color)} />
        <h3 className="text-sm font-medium text-white">{column.label}</h3>
        <span className="text-xs text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
          {columnFeatures.length}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2 min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {columnFeatures.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} agents={agents} />
          ))}
        </AnimatePresence>
        
        {columnFeatures.length === 0 && (
          <div className="p-4 rounded-lg border border-dashed border-white/10 text-center">
            <p className="text-xs text-white/30">No features</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Main Component
export function FeatureBoard() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const isDemoMode = !supabase

  useEffect(() => {
    async function loadData() {
      if (isDemoMode) {
        setFeatures(demoFeatures)
        setAgents(demoAgents)
        setIsLoading(false)
        return
      }

      try {
        const sb = supabase!
        
        // Load features
        const { data: featuresData, error: featuresError } = await sb
          .from('features')
          .select('*')
          .neq('status', 'cancelled')
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false })

        if (featuresError) throw featuresError
        
        // Load agents
        const { data: agentsData, error: agentsError } = await sb
          .from('agents')
          .select('id, name, emoji')

        if (agentsError) throw agentsError

        setFeatures(featuresData || [])
        setAgents(agentsData || [])
      } catch (err) {
        console.error('Error loading data:', err)
        // Fallback to demo data
        setFeatures(demoFeatures)
        setAgents(demoAgents)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isDemoMode])

  // Filter features
  const filteredFeatures = features.filter(f => {
    if (searchQuery && !f.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (filterPriority && f.priority !== filterPriority) {
      return false
    }
    return true
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/50">Loading features...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Feature Board</h2>
          <p className="text-sm text-white/50">Track feature requests and development progress</p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Feature
        </Button>
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <p className="text-sm text-yellow-400/80">
              Demo mode — Run migration SQL in Supabase for live data
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>
        
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-white/30 mr-1" />
          {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(filterPriority === p ? null : p)}
              className={cn(
                "px-2 py-1 text-xs rounded transition-all",
                filterPriority === p
                  ? priorityConfig[p].color
                  : "bg-white/5 text-white/40 hover:bg-white/10"
              )}
            >
              {priorityConfig[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            features={filteredFeatures}
            agents={agents}
          />
        ))}
      </div>
    </div>
  )
}
