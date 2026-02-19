import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// ─── Build agent system prompt from Supabase config files ────────
async function buildAgentSystemPrompt(agentId: string): Promise<string | null> {
  const sb = getSupabase()

  const { data: agent, error } = await sb
    .from('agents')
    .select('id, name, role, soul_md, identity_md, tools_md, user_md, memory_md, agents_md')
    .eq('id', agentId)
    .single()

  if (error || !agent) {
    console.error(`Failed to fetch agent config for ${agentId}:`, error)
    return null
  }

  // Build system prompt from the agent's config files
  const parts: string[] = []

  // SOUL.md is the core identity — most important
  if (agent.soul_md) {
    parts.push(agent.soul_md)
  }

  // IDENTITY.md — quick reference card
  if (agent.identity_md) {
    parts.push(`\n---\n# Identity Reference\n${agent.identity_md}`)
  }

  // TOOLS.md — what the agent can do
  if (agent.tools_md) {
    parts.push(`\n---\n# Tools & Capabilities\n${agent.tools_md}`)
  }

  // USER.md — who they're talking to
  if (agent.user_md) {
    parts.push(`\n---\n# User Context\n${agent.user_md}`)
  }

  // AGENTS.md — organizational awareness
  if (agent.agents_md) {
    parts.push(`\n---\n# Agent Network\n${agent.agents_md}`)
  }

  // MEMORY.md — recent context (truncate to avoid token bloat)
  if (agent.memory_md) {
    const memoryTruncated = agent.memory_md.length > 2000
      ? agent.memory_md.slice(0, 2000) + '\n\n[Memory truncated...]'
      : agent.memory_md
    parts.push(`\n---\n# Memory\n${memoryTruncated}`)
  }

  if (parts.length === 0) {
    // No config files — fall back to basic prompt
    return `You are ${agent.name} (${agentId}), role: ${agent.role || 'AI Agent'}. Respond helpfully and stay in character.`
  }

  return parts.join('\n')
}

// ─── Send to OpenClaw gateway with agent persona ─────────────────
async function sendToGateway({
  agentId,
  sessionKey,
  message,
  systemPrompt,
}: {
  agentId: string
  sessionKey: string
  message: string
  systemPrompt: string | null
}) {
  if (!GATEWAY_TOKEN) throw new Error('Gateway token not configured')

  // Build messages array with system prompt if available
  const messages: Array<{ role: string; content: string }> = []

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }

  messages.push({ role: 'user', content: message })

  const gatewayResponse = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
      'x-openclaw-agent-id': agentId,
      'x-openclaw-session-key': sessionKey,
    },
    body: JSON.stringify({
      model: `openclaw:${agentId}`,
      messages,
      stream: false,
    }),
  })

  if (!gatewayResponse.ok) {
    const errorText = await gatewayResponse.text()
    throw new Error(`Gateway error: ${gatewayResponse.status} ${errorText}`)
  }

  const data = await gatewayResponse.json()
  return data?.choices?.[0]?.message?.content || ''
}

// ─── GET: Fetch messages for a work item ─────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = getSupabase()

  const { data, error } = await sb
    .from('work_item_messages')
    .select('*')
    .eq('work_item_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// ─── POST: Send message + bridge to assigned agent ───────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const sb = getSupabase()

  const { sender_type, sender_id, sender_name, content, metadata } = body

  if (!sender_type || !sender_id || !sender_name || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Save user message
  const { data, error } = await sb
    .from('work_item_messages')
    .insert({
      work_item_id: id,
      sender_type,
      sender_id,
      sender_name,
      content,
      metadata: metadata || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If user message, bridge to assigned agent with persona
  if (sender_type === 'user') {
    try {
      // Fetch the feature to get assigned agent
      const { data: feature } = await sb
        .from('features')
        .select('assigned_to, title, description')
        .eq('id', id)
        .single()

      const agentId = feature?.assigned_to

      if (agentId) {
        // Fetch agent's display name
        const { data: agentInfo } = await sb
          .from('agents')
          .select('name')
          .eq('id', agentId)
          .single()

        const agentName = agentInfo?.name || agentId

        // Orchestrator ack
        await sb.from('work_item_messages').insert({
          work_item_id: id,
          sender_type: 'orchestrator',
          sender_id: 'HBx',
          sender_name: 'HBx',
          content: `Routed to ${agentName} (${agentId}).`,
          metadata: { routed_to: agentId },
        })

        // Build the agent's persona from their Supabase config
        const systemPrompt = await buildAgentSystemPrompt(agentId)

        // Use a unique session per work item + agent for conversation continuity
        const sessionKey = `work-item-${id}-${agentId}`

        const agentReply = await sendToGateway({
          agentId,
          sessionKey,
          message: content,
          systemPrompt,
        })

        if (agentReply) {
          await sb.from('work_item_messages').insert({
            work_item_id: id,
            sender_type: 'agent',
            sender_id: agentId,
            sender_name: agentName,
            content: agentReply,
            metadata: { session_key: sessionKey, persona_loaded: !!systemPrompt },
          })
        }
      }
    } catch (err) {
      console.error('Bridge error:', err)
      // Save error as orchestrator message so user sees something
      await sb.from('work_item_messages').insert({
        work_item_id: id,
        sender_type: 'orchestrator',
        sender_id: 'HBx',
        sender_name: 'HBx',
        content: `⚠️ Bridge error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        metadata: { error: true },
      })
    }
  }

  return NextResponse.json(data)
}
