import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/orchestrator/sessions
 * 
 * Reads session snapshots from Supabase gateway_sessions table.
 * Session data is synced from the VPS via scripts/sync-sessions.sh every 5 min.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = createClient(supabaseUrl, supabaseKey)

    let query = supabase
      .from('gateway_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (filter === 'subagents') {
      query = query.eq('is_sub_agent', true)
    } else if (filter === 'cron') {
      query = query.eq('is_cron', true)
    } else if (filter === 'dashboard') {
      query = query.or('kind.eq.webchat,display_name.ilike.%dashboard%')
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error('[Sessions Query Error]', error)
      return NextResponse.json(
        { error: error.message, sessions: [], count: 0 },
        { status: 500 }
      )
    }

    // Transform for UI compatibility
    const transformed = (sessions || []).map(s => ({
      key: s.session_key,
      sessionId: s.session_key,
      kind: s.kind || 'unknown',
      channel: s.is_cron ? 'cron' : s.is_main ? 'telegram' : 'unknown',
      model: s.model || 'unknown',
      modelProvider: '',
      totalTokens: s.total_tokens || 0,
      inputTokens: 0,
      outputTokens: 0,
      updatedAt: s.updated_at || 0,
      ageMs: Date.now() - (s.updated_at || 0),
      agentId: s.agent_id || 'main',
      displayName: s.display_name || s.session_key,
      label: '',
      isSubAgent: s.is_sub_agent || false,
      isCron: s.is_cron || false,
      isDashboard: s.display_name?.includes('Dashboard') || false,
      isMain: s.is_main || false,
      contextTokens: 0,
      percentUsed: s.percent_used || 0,
      aborted: false,
      lastMessages: [],
    }))

    return NextResponse.json({
      sessions: transformed,
      count: transformed.length,
      filter,
    })

  } catch (error) {
    console.error('[Orchestrator Sessions Error]', error)
    return NextResponse.json(
      { error: 'Failed to load sessions', sessions: [], count: 0 },
      { status: 500 }
    )
  }
}
