import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import {
  buildAgentSystemPrompt,
  isDirectLLMAgent,
  callDirectLLM,
  callGateway,
} from '@/lib/llm-direct'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
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

  // If user message, bridge to assigned agent
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

        // Build the agent's persona from their Supabase config
        const systemPrompt = await buildAgentSystemPrompt(agentId)
        const sessionKey = `work-item-${id}-${agentId}`

        let agentReply = ''

        if (isDirectLLMAgent(agentId)) {
          // Sub-agents: call Anthropic directly (correct persona)
          agentReply = await callDirectLLM({
            systemPrompt: systemPrompt || `You are ${agentName} (${agentId}). Respond helpfully.`,
            messages: [{ role: 'user', content }],
          })
        } else {
          // HBx: route through gateway
          const messages = [{ role: 'user', content }]
          if (systemPrompt) {
            messages.unshift({ role: 'system', content: systemPrompt })
          }
          const result = await callGateway({
            agentId,
            sessionKey,
            messages,
            stream: false,
          })
          agentReply = result as string
        }

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
