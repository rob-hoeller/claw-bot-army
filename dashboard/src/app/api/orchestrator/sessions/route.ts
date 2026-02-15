import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/orchestrator/sessions
 * 
 * Lists all active OpenClaw sessions with filtering options.
 * Shows sub-agent sessions spawned by the orchestrator.
 * 
 * Query params:
 * - filter?: 'all' | 'subagents' | 'dashboard' - filter session types
 * - activeMinutes?: number - only sessions active in last N minutes
 * - limit?: number - max sessions to return
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

export interface OpenClawSession {
  key: string
  sessionId: string
  kind: string
  channel: string
  model: string
  totalTokens: number
  updatedAt: number
  displayName?: string
  label?: string
  transcriptPath?: string
  messages?: Array<{
    role: string
    content: string | Array<{ type: string; text?: string }>
    timestamp?: number
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const activeMinutes = parseInt(searchParams.get('activeMinutes') || '0')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!GATEWAY_TOKEN) {
      return NextResponse.json(
        { error: 'Gateway token not configured' },
        { status: 500 }
      )
    }

    // Call sessions_list via tools/invoke
    const gatewayResponse = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'sessions_list',
        args: {
          limit,
          messageLimit: 3, // Include last few messages for preview
          ...(activeMinutes > 0 && { activeMinutes }),
        },
      }),
    })

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text()
      console.error('[Gateway Error]', gatewayResponse.status, errorText)
      return NextResponse.json(
        { error: `Gateway error: ${gatewayResponse.status}` },
        { status: gatewayResponse.status }
      )
    }

    const data = await gatewayResponse.json()
    
    if (!data.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Failed to list sessions' },
        { status: 400 }
      )
    }

    let sessions: OpenClawSession[] = data.result?.sessions || []

    // Apply filters
    if (filter === 'subagents') {
      // Sub-agent sessions typically have 'isolated' kind or specific label patterns
      sessions = sessions.filter(s => 
        s.kind === 'isolated' || 
        s.label?.includes('spawn') ||
        s.key.includes('spawn')
      )
    } else if (filter === 'dashboard') {
      // Dashboard sessions have 'dashboard' in the key
      sessions = sessions.filter(s => s.key.includes('dashboard'))
    }

    // Transform for UI
    const transformed = sessions.map(s => ({
      key: s.key,
      sessionId: s.sessionId,
      kind: s.kind,
      channel: s.channel,
      model: s.model,
      totalTokens: s.totalTokens,
      updatedAt: s.updatedAt,
      displayName: s.displayName || extractDisplayName(s.key),
      label: s.label,
      isSubAgent: s.kind === 'isolated' || s.key.includes('spawn'),
      isDashboard: s.key.includes('dashboard'),
      lastMessages: (s.messages || []).map(m => ({
        role: m.role,
        content: typeof m.content === 'string' 
          ? m.content 
          : m.content?.find(c => c.type === 'text')?.text || '',
        timestamp: m.timestamp,
      })),
    }))

    return NextResponse.json({
      sessions: transformed,
      count: transformed.length,
      filter,
    })

  } catch (error) {
    console.error('[Orchestrator Sessions Error]', error)
    return NextResponse.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    )
  }
}

// Extract a friendly display name from the session key
function extractDisplayName(key: string): string {
  // dashboard-hbx-lance -> HBx (Lance)
  // agent:main:dashboard-hbx_sl1-robh -> HBx_SL1 (Robh)
  const match = key.match(/dashboard-([^-]+)-([^-]+)$/i)
  if (match) {
    return `${match[1].toUpperCase()} (${capitalize(match[2])})`
  }
  
  // Spawn sessions: spawn:task-123 -> Spawn Task
  if (key.includes('spawn')) {
    return 'Sub-Agent Task'
  }
  
  return key.split(':').pop() || key
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
