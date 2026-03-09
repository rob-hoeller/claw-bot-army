import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * GET /api/orchestrator/sessions
 * 
 * Lists all active OpenClaw sessions via `openclaw sessions --json`.
 * 
 * Query params:
 * - filter?: 'all' | 'subagents' | 'dashboard' | 'cron' - filter session types
 * - activeMinutes?: number - only sessions active in last N minutes (default: 60)
 * - limit?: number - max sessions to return (default: 50)
 */

interface RawSession {
  key: string
  sessionId: string
  kind: string
  channel?: string
  model?: string
  modelProvider?: string
  totalTokens: number
  inputTokens?: number
  outputTokens?: number
  updatedAt: number
  ageMs?: number
  agentId?: string
  label?: string
  systemSent?: boolean
  abortedLastRun?: boolean
  contextTokens?: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const activeMinutes = parseInt(searchParams.get('activeMinutes') || '60')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Use openclaw CLI to get sessions
    const cmd = `openclaw sessions --json --all-agents${activeMinutes > 0 ? ` --active ${activeMinutes}` : ''}`
    
    const { stdout } = await execAsync(cmd, { 
      timeout: 10000,
      env: { ...process.env, PATH: `/home/ubuntu/.npm-global/bin:${process.env.PATH}` }
    })

    const data = JSON.parse(stdout)
    let sessions: RawSession[] = data.sessions || []

    // Apply filters
    if (filter === 'subagents') {
      sessions = sessions.filter(s => 
        s.kind === 'isolated' || 
        s.key.includes('spawn') ||
        s.key.includes('subagent')
      )
    } else if (filter === 'dashboard') {
      sessions = sessions.filter(s => 
        s.key.includes('dashboard') ||
        s.channel === 'webchat'
      )
    } else if (filter === 'cron') {
      sessions = sessions.filter(s => s.key.includes('cron'))
    }

    // Sort by most recently updated
    sessions.sort((a, b) => b.updatedAt - a.updatedAt)

    // Limit
    sessions = sessions.slice(0, limit)

    // Transform for UI
    const transformed = sessions.map(s => ({
      key: s.key,
      sessionId: s.sessionId,
      kind: s.kind || 'unknown',
      channel: s.channel || 'unknown',
      model: s.model || 'unknown',
      modelProvider: s.modelProvider || '',
      totalTokens: s.totalTokens || 0,
      inputTokens: s.inputTokens || 0,
      outputTokens: s.outputTokens || 0,
      updatedAt: s.updatedAt,
      ageMs: s.ageMs || 0,
      agentId: s.agentId || 'main',
      displayName: extractDisplayName(s),
      label: s.label || '',
      isSubAgent: s.kind === 'isolated' || s.key.includes('spawn'),
      isCron: s.key.includes('cron'),
      isDashboard: s.key.includes('dashboard') || s.channel === 'webchat',
      isMain: s.key === 'agent:main:main' || s.key.endsWith(':telegram:8391685290'),
      contextTokens: s.contextTokens || 0,
      aborted: s.abortedLastRun || false,
      lastMessages: [], // CLI doesn't return messages, but keep interface compatible
    }))

    return NextResponse.json({
      sessions: transformed,
      count: transformed.length,
      total: data.count || sessions.length,
      filter,
      activeMinutes,
    })

  } catch (error) {
    console.error('[Orchestrator Sessions Error]', error)
    const message = error instanceof Error ? error.message : 'Failed to list sessions'
    return NextResponse.json(
      { error: message, sessions: [], count: 0 },
      { status: 500 }
    )
  }
}

// Extract a friendly display name from the session
function extractDisplayName(session: RawSession): string {
  const key = session.key

  // Main agent session
  if (key === 'agent:main:main') return '🧠 HBx (Main)'

  // Telegram sessions: agent:main:telegram:8391685290
  const telegramMatch = key.match(/telegram:(\d+)$/)
  if (telegramMatch) return `💬 Telegram (${telegramMatch[1].slice(-4)})`

  // Cron sessions: agent:main:cron:uuid
  if (key.includes('cron')) {
    const label = session.label || 'Cron Job'
    return `⏰ ${label}`
  }

  // Dashboard sessions
  if (key.includes('dashboard')) return `📊 Dashboard`

  // Spawn/subagent sessions
  if (key.includes('spawn') || session.kind === 'isolated') {
    return `⚡ Sub-Agent${session.label ? `: ${session.label}` : ''}`
  }

  // Webchat
  if (key.includes('webchat')) return `🌐 Webchat`

  // Fallback: clean up the key
  const parts = key.split(':')
  return parts[parts.length - 1] || key
}
