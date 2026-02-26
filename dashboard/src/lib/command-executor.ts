/**
 * Command Executor
 * 
 * Executes commands based on classified intent.
 * Uses Supabase client-side queries to fetch platform data.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IntentClassification } from '@/components/command-center/command-center.types'
import { formatDistanceToNow, subDays, startOfDay } from 'date-fns'

/**
 * Execute a command based on classified intent
 */
export async function executeCommand(
  intent: IntentClassification,
  input: string,
  supabase: SupabaseClient | null
): Promise<string> {
  // If no Supabase client, return helpful error
  if (!supabase) {
    return "Database connection not available. Please configure Supabase credentials to use this feature."
  }

  try {
    switch (intent.intent) {
      case 'query':
        return await handleQueryIntent(intent, input, supabase)
      case 'report':
        return await handleReportIntent(intent, input, supabase)
      case 'analyze':
        return await handleAnalyzeIntent(intent, input, supabase)
      case 'operate':
        return await handleOperateIntent(intent, input, supabase)
      case 'build':
        return handleBuildIntent(intent, input)
      case 'unknown':
      default:
        return getUnknownIntentResponse()
    }
  } catch (error) {
    console.error('Command execution error:', error)
    return `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

/**
 * Handle query intent — fetch and display data
 */
async function handleQueryIntent(
  intent: IntentClassification,
  input: string,
  supabase: SupabaseClient
): Promise<string> {
  const lower = input.toLowerCase()

  // Query: How many agents?
  if (lower.includes('how many agent') || lower.includes('count agent')) {
    const { count, error } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    
    if (error) throw error
    return `There are **${count || 0} active agents** right now.`
  }

  // Query: How many features?
  if (lower.includes('how many feature') || lower.includes('count feature')) {
    const { data, error } = await supabase
      .from('features')
      .select('status')
    
    if (error) throw error
    
    const total = data?.length || 0
    const byStatus: Record<string, number> = {}
    data?.forEach(f => {
      byStatus[f.status] = (byStatus[f.status] || 0) + 1
    })
    
    const statusLines = Object.entries(byStatus)
      .map(([status, count]) => `• ${status}: ${count}`)
      .join('\n')
    
    return `**${total} features total:**\n${statusLines}`
  }

  // Query: What agents are working / active?
  if (lower.includes('what agent') || lower.includes('which agent') || lower.includes('list agent')) {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'active')
      .order('name')
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return "No active agents found."
    }
    
    const lines = data.map(agent => {
      const lastActive = agent.last_active 
        ? formatDistanceToNow(new Date(agent.last_active), { addSuffix: true })
        : 'never'
      return `• **${agent.name}** (${agent.department}) — last active ${lastActive}`
    })
    
    return `**Active agents:**\n${lines.join('\n')}`
  }

  // Query: What's in the pipeline?
  if (lower.includes('pipeline') || lower.includes('in progress') || lower.includes('working on')) {
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .not('status', 'in', '(done,cancelled)')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10)
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return "Pipeline is empty — no active features!"
    }
    
    const lines = data.map(f => {
      const priorityEmoji: Record<string, string> = {
        urgent: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🔵'
      }
      const emoji = priorityEmoji[f.priority] || '⚪'
      
      return `${emoji} **${f.title}**\n  → Status: ${f.status} | Current step: ${f.current_step || 'intake'}`
    })
    
    return `**${data.length} features in pipeline:**\n\n${lines.join('\n\n')}`
  }

  // Generic query fallback
  return "I can help you query:\n• Agent counts and status\n• Feature counts by status\n• What's in the pipeline\n\nTry asking: 'How many agents are active?' or 'What's in the pipeline?'"
}

/**
 * Handle report intent — aggregate and summarize data
 */
async function handleReportIntent(
  intent: IntentClassification,
  input: string,
  supabase: SupabaseClient
): Promise<string> {
  const lower = input.toLowerCase()

  // Report: What shipped today?
  if (lower.includes('today') && (lower.includes('shipped') || lower.includes('completed'))) {
    const today = startOfDay(new Date())
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .eq('status', 'done')
      .gte('completed_at', today.toISOString())
      .order('completed_at', { ascending: false })
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return "Nothing shipped today yet. 🚀"
    }
    
    const lines = data.map(f => {
      const time = f.completed_at 
        ? formatDistanceToNow(new Date(f.completed_at), { addSuffix: true })
        : 'unknown'
      return `• **${f.title}**\n  Completed ${time}`
    })
    
    return `**Shipped today (${data.length}):**\n\n${lines.join('\n\n')}`
  }

  // Report: What shipped this week?
  if (lower.includes('week') && (lower.includes('shipped') || lower.includes('completed'))) {
    const weekAgo = subDays(new Date(), 7)
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .eq('status', 'done')
      .gte('completed_at', weekAgo.toISOString())
      .order('completed_at', { ascending: false })
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return "Nothing shipped this week. Time to ship! 🚢"
    }
    
    const lines = data.map(f => {
      const time = f.completed_at 
        ? formatDistanceToNow(new Date(f.completed_at), { addSuffix: true })
        : 'unknown'
      const prLink = f.pr_url ? ` • [PR](${f.pr_url})` : ''
      return `• **${f.title}**${prLink}\n  Completed ${time}`
    })
    
    return `**Shipped this week (${data.length}):**\n\n${lines.join('\n\n')}`
  }

  // Report: Feature metrics
  if (lower.includes('metric') || lower.includes('stats') || lower.includes('statistics')) {
    const { data, error } = await supabase
      .from('features')
      .select('*')
    
    if (error) throw error
    
    const total = data?.length || 0
    const byStatus: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    
    data?.forEach(f => {
      byStatus[f.status] = (byStatus[f.status] || 0) + 1
      byPriority[f.priority] = (byPriority[f.priority] || 0) + 1
    })
    
    const statusLines = Object.entries(byStatus)
      .map(([status, count]) => `  • ${status}: ${count}`)
      .join('\n')
    
    const priorityLines = Object.entries(byPriority)
      .map(([priority, count]) => `  • ${priority}: ${count}`)
      .join('\n')
    
    return `**Feature Metrics:**\n\n**Total:** ${total}\n\n**By Status:**\n${statusLines}\n\n**By Priority:**\n${priorityLines}`
  }

  // Generic report fallback
  return "I can generate reports for:\n• What shipped today/this week\n• Feature metrics and statistics\n\nTry asking: 'What shipped today?' or 'Show me feature metrics'"
}

/**
 * Handle analyze intent — insights and recommendations
 */
async function handleAnalyzeIntent(
  intent: IntentClassification,
  input: string,
  supabase: SupabaseClient
): Promise<string> {
  const lower = input.toLowerCase()

  // Analyze: Top priorities
  if (lower.includes('top') || lower.includes('priorit')) {
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .not('status', 'in', '(done,cancelled)')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(5)
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return "No active features to prioritize right now."
    }
    
    const lines = data.map((f, i) => {
      const priorityEmoji: Record<string, string> = {
        urgent: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🔵'
      }
      const emoji = priorityEmoji[f.priority] || '⚪'
      
      return `${i + 1}. ${emoji} **${f.title}**\n   Priority: ${f.priority} | Status: ${f.status}`
    })
    
    return `**Top 5 Priorities:**\n\n${lines.join('\n\n')}`
  }

  // Analyze: Agent workload
  if (lower.includes('workload') || lower.includes('who') && lower.includes('working')) {
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .not('status', 'in', '(done,cancelled)')
    
    if (error) throw error
    
    const byAgent: Record<string, string[]> = {}
    data?.forEach(f => {
      if (f.current_agent) {
        if (!byAgent[f.current_agent]) byAgent[f.current_agent] = []
        byAgent[f.current_agent].push(f.title)
      }
    })
    
    if (Object.keys(byAgent).length === 0) {
      return "No features currently assigned to agents."
    }
    
    const lines = Object.entries(byAgent).map(([agent, features]) => {
      return `**${agent}** (${features.length}):\n${features.map(t => `  • ${t}`).join('\n')}`
    })
    
    return `**Agent Workload:**\n\n${lines.join('\n\n')}`
  }

  // Analyze: Stalled features
  if (lower.includes('stall') || lower.includes('stuck') || lower.includes('blocked')) {
    const threeDaysAgo = subDays(new Date(), 3)
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .not('status', 'in', '(done,cancelled)')
      .lt('updated_at', threeDaysAgo.toISOString())
      .order('updated_at', { ascending: true })
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return "✅ No stalled features — everything is moving!"
    }
    
    const lines = data.map(f => {
      const age = formatDistanceToNow(new Date(f.updated_at), { addSuffix: true })
      return `⚠️ **${f.title}**\n   Last updated ${age} | Status: ${f.status}`
    })
    
    return `**🚨 Stalled Features (${data.length}):**\n\n${lines.join('\n\n')}`
  }

  // Generic analyze fallback
  return "I can analyze:\n• Top priorities\n• Agent workload\n• Stalled features\n\nTry asking: 'Show me top priorities' or 'What's stalled?'"
}

/**
 * Handle operate intent — system health and operations
 */
async function handleOperateIntent(
  intent: IntentClassification,
  input: string,
  supabase: SupabaseClient
): Promise<string> {
  const lower = input.toLowerCase()

  // Operate: Agent health check
  if (lower.includes('health') || lower.includes('status') && lower.includes('agent')) {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return "No agents found in the system."
    }
    
    const now = new Date()
    const lines = data.map(agent => {
      const isActive = agent.status === 'active'
      const lastActive = agent.last_active 
        ? new Date(agent.last_active)
        : null
      
      let healthStatus = '🔴 Offline'
      if (isActive && lastActive) {
        const minutesSinceActive = (now.getTime() - lastActive.getTime()) / 1000 / 60
        if (minutesSinceActive < 5) healthStatus = '🟢 Healthy'
        else if (minutesSinceActive < 30) healthStatus = '🟡 Idle'
        else healthStatus = '🟠 Stale'
      }
      
      const lastActiveStr = lastActive 
        ? formatDistanceToNow(lastActive, { addSuffix: true })
        : 'never'
      
      return `${healthStatus} **${agent.name}**\n   ${agent.department} | Last active: ${lastActiveStr}`
    })
    
    return `**Agent Health Check:**\n\n${lines.join('\n\n')}`
  }

  // Operate: Pipeline status
  if (lower.includes('pipeline') && lower.includes('status')) {
    const { data, error } = await supabase
      .from('features')
      .select('current_step')
      .not('status', 'in', '(done,cancelled)')
    
    if (error) throw error
    
    const byStep: Record<string, number> = {}
    data?.forEach(f => {
      const step = f.current_step || 'intake'
      byStep[step] = (byStep[step] || 0) + 1
    })
    
    if (Object.keys(byStep).length === 0) {
      return "Pipeline is empty — ready for new features!"
    }
    
    const lines = Object.entries(byStep)
      .map(([step, count]) => `  • ${step}: ${count}`)
      .join('\n')
    
    return `**Pipeline Status:**\n\n${lines}\n\n**Total in pipeline:** ${data?.length || 0}`
  }

  // Operate: System status (dashboard summary)
  if (lower.includes('system') || lower.includes('dashboard') || lower.includes('overview')) {
    const [agentsRes, featuresRes] = await Promise.all([
      supabase.from('agents').select('*', { count: 'exact', head: true }),
      supabase.from('features').select('*')
    ])
    
    if (agentsRes.error) throw agentsRes.error
    if (featuresRes.error) throw featuresRes.error
    
    const activeFeatures = featuresRes.data?.filter(f => 
      f.status !== 'done' && f.status !== 'cancelled'
    ).length || 0
    
    const completedToday = featuresRes.data?.filter(f => {
      if (f.status !== 'done' || !f.completed_at) return false
      const completed = new Date(f.completed_at)
      const today = startOfDay(new Date())
      return completed >= today
    }).length || 0
    
    return `**🧠 HBx System Status:**\n\n• **Agents:** ${agentsRes.count || 0} registered\n• **Active Features:** ${activeFeatures}\n• **Completed Today:** ${completedToday}\n• **Total Features:** ${featuresRes.data?.length || 0}\n\n✅ All systems operational`
  }

  // Generic operate fallback
  return "I can check:\n• Agent health\n• Pipeline status\n• System status\n\nTry asking: 'Agent health check' or 'System status'"
}

/**
 * Handle build intent — feature creation flow
 */
function handleBuildIntent(
  intent: IntentClassification,
  input: string
): string {
  // Extract title from input (remove common prefixes)
  const lower = input.toLowerCase()
  const prefixes = [
    'i want to ', 'i need to ', 'can you ', 'please ', 'could you ',
    'build ', 'create ', 'add ', 'make ', 'implement ', 'develop '
  ]
  
  let title = input.trim()
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      title = input.slice(prefix.length).trim()
      break
    }
  }
  
  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1)
  }
  
  // Determine priority
  let priority = 'medium'
  if (lower.includes('urgent') || lower.includes('critical') || lower.includes('asap')) {
    priority = 'urgent'
  } else if (lower.includes('high priority') || lower.includes('important')) {
    priority = 'high'
  } else if (lower.includes('low priority') || lower.includes('nice to have')) {
    priority = 'low'
  }
  
  return `I'd love to help you build that! Let me capture this as a feature request.\n\n**Title:** ${title}\n**Priority:** ${priority}\n\nShall I create this feature and start the pipeline?`
}

/**
 * Response for unknown intent
 */
function getUnknownIntentResponse(): string {
  return `I'm not sure how to help with that yet. Here's what I can do:\n\n**🔨 Build** — Create new features\n  _"I want to add a notification badge"_\n\n**🔍 Query** — Ask about platform data\n  _"How many agents are active?"_\n\n**📊 Report** — Get summaries and metrics\n  _"What shipped this week?"_\n\n**📈 Analyze** — Insights and recommendations\n  _"Show me top priorities"_\n\n**⚙️ Operate** — Check system health\n  _"Run agent health check"_\n\nWhat would you like to do?`
}
