import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  buildAgentSystemPrompt,
  isDirectLLMAgent,
  streamDirectLLM,
} from '@/lib/llm-direct'

export const maxDuration = 60

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * POST /api/work-items/[id]/stream
 *
 * Streams an agent response for a work-item chat message.
 * Same streaming approach as Agent Admin chat — consistent UX.
 *
 * Body: { message, history? }
 * Returns: SSE stream (OpenAI-compatible format)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { message, history = [] } = body

  if (!message) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 })
  }

  const sb = getSupabase()

  // Fetch the feature to get assigned agent
  const { data: feature, error: featureErr } = await sb
    .from('features')
    .select('assigned_to, title, description')
    .eq('id', id)
    .single()

  if (featureErr || !feature?.assigned_to) {
    return NextResponse.json({ error: 'No agent assigned to this feature' }, { status: 404 })
  }

  const agentId = feature.assigned_to

  // Build persona from Supabase
  const systemPrompt = await buildAgentSystemPrompt(agentId)

  if (isDirectLLMAgent(agentId)) {
    // Sub-agents: stream from Anthropic directly
    if (!systemPrompt) {
      return NextResponse.json({ error: `No persona config for ${agentId}` }, { status: 404 })
    }

    const llmMessages = [
      ...history.slice(-20).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    return streamDirectLLM({ systemPrompt, messages: llmMessages })
  }

  // HBx: stream through gateway
  if (!GATEWAY_TOKEN) {
    return NextResponse.json({ error: 'Server misconfiguration: Gateway token not configured. Contact admin.' }, { status: 503 })
  }

  const sessionKey = `work-item-${id}-${agentId}`
  const messages = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push(...history.slice(-20).map((m: { role: string; content: string }) => ({
    role: m.role,
    content: m.content,
  })))
  messages.push({ role: 'user', content: message })

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
      stream: true,
    }),
  })

  if (!gatewayResponse.ok) {
    const errText = await gatewayResponse.text()
    return NextResponse.json(
      { error: `Gateway error: ${gatewayResponse.status}` },
      { status: gatewayResponse.status }
    )
  }

  return new Response(gatewayResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
