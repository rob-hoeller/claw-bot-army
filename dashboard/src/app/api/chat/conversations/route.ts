import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/chat/conversations?shortId=lance&agentId=hbx
 * 
 * Resolves a short user ID (lance/robl/robh) to a Supabase auth UUID
 * via the user_mappings table, then loads or creates a conversation.
 * Uses service role to bypass RLS (dashboard needs cross-user read access).
 * 
 * POST /api/chat/conversations
 * { conversationId, role, content, attachments }
 * Saves a message to a conversation.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

export async function GET(request: NextRequest) {
  const sb = getServiceClient()
  if (!sb) {
    return NextResponse.json({ error: 'Server misconfiguration: Supabase environment variables not set. Contact admin.' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const shortId = searchParams.get('shortId')
  const agentId = searchParams.get('agentId')

  if (!shortId || !agentId) {
    return NextResponse.json({ error: 'Missing shortId or agentId' }, { status: 400 })
  }

  try {
    // Resolve short_id → auth_uuid
    const { data: mapping, error: mapErr } = await sb
      .from('user_mappings')
      .select('auth_uuid, display_name')
      .eq('short_id', shortId)
      .single()

    if (mapErr || !mapping) {
      return NextResponse.json({ error: `Unknown user: ${shortId}` }, { status: 404 })
    }

    const authUuid = mapping.auth_uuid
    const displayName = mapping.display_name

    // Find or create conversation
    const { data: existingConv, error: fetchErr } = await sb
      .from('conversations')
      .select('*')
      .eq('user_id', authUuid)
      .eq('agent_id', agentId)
      .single()

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      throw fetchErr
    }

    let conv = existingConv

    if (!conv) {
      const { data: newConv, error: createErr } = await sb
        .from('conversations')
        .insert({
          user_id: authUuid,
          agent_id: agentId,
          title: `Chat with ${displayName}`
        })
        .select()
        .single()

      if (createErr) throw createErr
      conv = newConv
    }

    // Load recent messages
    const { data: msgs, error: msgsErr } = await sb
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(11) // PAGE_SIZE + 1

    if (msgsErr) throw msgsErr

    const hasMore = (msgs?.length || 0) > 10
    const displayMsgs = hasMore ? msgs!.slice(0, 10) : (msgs || [])

    return NextResponse.json({
      conversation: conv,
      messages: displayMsgs.reverse(),
      hasMore,
      authUuid,
    })
  } catch (err) {
    console.error('[Conversations API Error]', err)
    return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sb = getServiceClient()
  if (!sb) {
    return NextResponse.json({ error: 'Server misconfiguration: Supabase environment variables not set. Contact admin.' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { conversationId, role, content, attachments } = body

    if (!conversationId || !role || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: msg, error: saveErr } = await sb
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        attachments: attachments || []
      })
      .select()
      .single()

    if (saveErr) throw saveErr

    return NextResponse.json({ message: msg })
  } catch (err) {
    console.error('[Save Message Error]', err)
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }
}
