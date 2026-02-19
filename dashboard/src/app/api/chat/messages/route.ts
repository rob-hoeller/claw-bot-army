import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

export async function GET(request: NextRequest) {
  const sb = getServiceClient()
  if (!sb) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversationId')
  const before = searchParams.get('before')
  const limit = parseInt(searchParams.get('limit') || '11', 10)

  if (!conversationId || !before) {
    return NextResponse.json({ error: 'Missing conversationId or before' }, { status: 400 })
  }

  try {
    const { data: olderMsgs, error: fetchErr } = await sb
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (fetchErr) throw fetchErr

    return NextResponse.json({ messages: olderMsgs || [] })
  } catch (err) {
    console.error('[Messages API Error]', err)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sb = getServiceClient()
  if (!sb) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { conversationId, role, content, attachments } = body

    if (!conversationId || !role || (!content && (!attachments || attachments.length === 0))) {
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
