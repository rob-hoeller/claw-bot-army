/**
 * Direct LLM API client — bypasses OpenClaw Gateway for sub-agent chats.
 *
 * Why: The gateway always injects the workspace persona (HBx), which overrides
 * any system prompt the dashboard injects. For sub-agents (IN2, SL1, etc.),
 * we call Anthropic directly so the Supabase persona is the ONLY system prompt.
 *
 * HBx (main) still routes through the gateway for full tool/memory support.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
const ANTHROPIC_MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096', 10)

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// ─── Build agent system prompt from Supabase config files ────────
export async function buildAgentSystemPrompt(agentId: string): Promise<string | null> {
  const sb = getSupabase()

  const { data: agent, error } = await sb
    .from('agents')
    .select('id, name, role, soul_md, identity_md, tools_md, user_md, memory_md, agents_md')
    .eq('id', agentId)
    .single()

  if (error || !agent) {
    console.error(`[LLM Direct] Failed to fetch agent config for ${agentId}:`, error)
    return null
  }

  const parts: string[] = []

  if (agent.soul_md) {
    parts.push(agent.soul_md)
  }
  if (agent.identity_md) {
    parts.push(`\n---\n# Identity Reference\n${agent.identity_md}`)
  }
  if (agent.tools_md) {
    parts.push(`\n---\n# Tools & Capabilities\n${agent.tools_md}`)
  }
  if (agent.user_md) {
    parts.push(`\n---\n# User Context\n${agent.user_md}`)
  }
  if (agent.agents_md) {
    parts.push(`\n---\n# Agent Network\n${agent.agents_md}`)
  }
  if (agent.memory_md) {
    const memoryTruncated = agent.memory_md.length > 2000
      ? agent.memory_md.slice(0, 2000) + '\n\n[Memory truncated...]'
      : agent.memory_md
    parts.push(`\n---\n# Memory\n${memoryTruncated}`)
  }

  if (parts.length === 0) {
    return `You are ${agent.name} (${agentId}), role: ${agent.role || 'AI Agent'}. Respond helpfully and stay in character.`
  }

  return parts.join('\n')
}

// ─── Check if agent should use direct LLM (not gateway) ─────────
export function isDirectLLMAgent(agentId: string): boolean {
  // HBx (main orchestrator) uses the gateway for full tool/memory support
  // All sub-agents use direct LLM to avoid gateway persona override
  const gatewayAgents = ['HBx', 'hbx', 'main']
  return !gatewayAgents.includes(agentId)
}

// ─── Streaming: call Anthropic Messages API directly ─────────────
export async function streamDirectLLM({
  systemPrompt,
  messages,
}: {
  systemPrompt: string
  messages: Array<{ role: string; content: string }>
}): Promise<Response> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured — required for sub-agent chat')
  }

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      stream: true,
    }),
  })

  if (!anthropicResponse.ok) {
    const errText = await anthropicResponse.text()
    console.error('[LLM Direct] Anthropic error:', anthropicResponse.status, errText)
    throw new Error(`Anthropic API error: ${anthropicResponse.status}`)
  }

  // Transform Anthropic SSE format → OpenAI-compatible SSE format
  // so ChatPanel's existing parseSSEStream works unchanged
  const anthropicBody = anthropicResponse.body
  if (!anthropicBody) throw new Error('No response body from Anthropic')

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk)
      const lines = text.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          try {
            const parsed = JSON.parse(data)

            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              // Convert to OpenAI chat/completions SSE format
              const openaiChunk = {
                choices: [{ delta: { content: parsed.delta.text } }],
              }
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify(openaiChunk)}\n\n`)
              )
            } else if (parsed.type === 'message_stop') {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    },
  })

  const stream = anthropicBody.pipeThrough(transformStream)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// ─── Non-streaming: call Anthropic Messages API directly ─────────
export async function callDirectLLM({
  systemPrompt,
  messages,
}: {
  systemPrompt: string
  messages: Array<{ role: string; content: string }>
}): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured — required for sub-agent chat')
  }

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    }),
  })

  if (!anthropicResponse.ok) {
    const errText = await anthropicResponse.text()
    console.error('[LLM Direct] Anthropic error:', anthropicResponse.status, errText)
    throw new Error(`Anthropic API error: ${anthropicResponse.status}`)
  }

  const data = await anthropicResponse.json()
  return data.content?.[0]?.text || ''
}

// ─── Gateway call (for HBx only) ────────────────────────────────
export async function callGateway({
  agentId,
  sessionKey,
  messages,
  stream = false,
}: {
  agentId: string
  sessionKey: string
  messages: Array<{ role: string; content: string }>
  stream?: boolean
}): Promise<Response | string> {
  if (!GATEWAY_TOKEN) throw new Error('Gateway token not configured')

  const gatewayResponse = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
      'x-openclaw-session-key': sessionKey,
    },
    body: JSON.stringify({
      model: `openclaw:${agentId}`,
      messages,
      stream,
    }),
  })

  if (!gatewayResponse.ok) {
    const errText = await gatewayResponse.text()
    throw new Error(`Gateway error: ${gatewayResponse.status} ${errText}`)
  }

  if (stream) {
    return new Response(gatewayResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  const data = await gatewayResponse.json()
  return data?.choices?.[0]?.message?.content || ''
}
