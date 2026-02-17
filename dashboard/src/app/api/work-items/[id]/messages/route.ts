import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

async function sendToGateway({ agentId, sessionKey, message }: { agentId: string; sessionKey: string; message: string }) {
  if (!GATEWAY_TOKEN) throw new Error('Gateway token not configured')

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
      messages: [{ role: 'user', content: message }],
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
      const { data: feature } = await sb
        .from('features')
        .select('assigned_to')
        .eq('id', id)
        .single()

      const agentId = feature?.assigned_to

      if (agentId) {
        // Orchestrator ack
        await sb.from('work_item_messages').insert({
          work_item_id: id,
          sender_type: 'orchestrator',
          sender_id: 'HBx',
          sender_name: 'HBx',
          content: `Routed to ${agentId}.`,
          metadata: { routed_to: agentId },
        })

        const sessionKey = `work-item-${id}`
        const agentReply = await sendToGateway({ agentId, sessionKey, message: content })

        if (agentReply) {
          await sb.from('work_item_messages').insert({
            work_item_id: id,
            sender_type: 'agent',
            sender_id: agentId,
            sender_name: agentId,
            content: agentReply,
            metadata: { session_key: sessionKey },
          })
        }
      }
    } catch (err) {
      console.error('Bridge error:', err)
    }
  }

  return NextResponse.json(data)
}
