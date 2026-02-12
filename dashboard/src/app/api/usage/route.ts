import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/usage
 * 
 * Fetch token usage data for dashboard
 * 
 * Query params:
 * - hours: Number of hours for time series (default: 24)
 * - days: Number of days for daily aggregates (default: 7)
 * - view: 'timeseries' | 'daily' | 'summary' | 'by-agent' | 'by-user' (default: summary)
 * - agent: Filter by agent_id
 * - user: Filter by user_id
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    
    const view = searchParams.get('view') || 'summary'
    const hours = parseInt(searchParams.get('hours') || '24')
    const days = parseInt(searchParams.get('days') || '7')
    const agentFilter = searchParams.get('agent')
    const userFilter = searchParams.get('user')

    // =======================================================================
    // SUMMARY VIEW - Overview cards
    // =======================================================================
    if (view === 'summary') {
      // Today's totals
      const todayStart = new Date()
      todayStart.setUTCHours(0, 0, 0, 0)
      
      const { data: todayData } = await supabase
        .from('token_usage')
        .select('delta_total_tokens, delta_cost, request_count')
        .gte('recorded_at', todayStart.toISOString())
      
      const today = {
        tokens: todayData?.reduce((sum, r) => sum + (r.delta_total_tokens || 0), 0) || 0,
        cost: todayData?.reduce((sum, r) => sum + parseFloat(r.delta_cost || '0'), 0) || 0,
        requests: todayData?.reduce((sum, r) => sum + (r.request_count || 0), 0) || 0,
      }

      // This week (last 7 days)
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      
      const { data: weekData } = await supabase
        .from('token_usage_daily')
        .select('total_tokens, total_cost, request_count')
        .gte('date', weekStart.toISOString().split('T')[0])
      
      const week = {
        tokens: weekData?.reduce((sum, r) => sum + parseInt(r.total_tokens || '0'), 0) || 0,
        cost: weekData?.reduce((sum, r) => sum + parseFloat(r.total_cost || '0'), 0) || 0,
        requests: weekData?.reduce((sum, r) => sum + (r.request_count || 0), 0) || 0,
      }

      // This month
      const monthStart = new Date()
      monthStart.setDate(1)
      
      const { data: monthData } = await supabase
        .from('token_usage_daily')
        .select('total_tokens, total_cost, request_count')
        .gte('date', monthStart.toISOString().split('T')[0])
      
      const month = {
        tokens: monthData?.reduce((sum, r) => sum + parseInt(r.total_tokens || '0'), 0) || 0,
        cost: monthData?.reduce((sum, r) => sum + parseFloat(r.total_cost || '0'), 0) || 0,
        requests: monthData?.reduce((sum, r) => sum + (r.request_count || 0), 0) || 0,
      }

      // Top agents by cost (last 7 days)
      const { data: topAgents } = await supabase
        .from('token_usage_daily')
        .select('agent_id, total_tokens, total_cost')
        .gte('date', weekStart.toISOString().split('T')[0])
        .order('total_cost', { ascending: false })

      // Aggregate by agent
      const agentTotals = topAgents?.reduce((acc, row) => {
        const agent = row.agent_id || 'unknown'
        if (!acc[agent]) acc[agent] = { tokens: 0, cost: 0 }
        acc[agent].tokens += parseInt(row.total_tokens || '0')
        acc[agent].cost += parseFloat(row.total_cost || '0')
        return acc
      }, {} as Record<string, { tokens: number; cost: number }>) || {}

      const topAgentsList = Object.entries(agentTotals)
        .map(([agent_id, data]) => ({ agent_id, ...data }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5)

      // Top users by cost (last 7 days)
      const userTotals = topAgents?.reduce((acc, row) => {
        // We need user data - fetch from token_usage for this
        return acc
      }, {} as Record<string, { tokens: number; cost: number }>) || {}

      const { data: userCostData } = await supabase
        .from('token_usage_daily')
        .select('user_id, total_tokens, total_cost')
        .gte('date', weekStart.toISOString().split('T')[0])

      const userTotalsMap = userCostData?.reduce((acc, row) => {
        const user = row.user_id || 'unknown'
        if (!acc[user]) acc[user] = { tokens: 0, cost: 0 }
        acc[user].tokens += parseInt(row.total_tokens || '0')
        acc[user].cost += parseFloat(row.total_cost || '0')
        return acc
      }, {} as Record<string, { tokens: number; cost: number }>) || {}

      const topUsersList = Object.entries(userTotalsMap)
        .map(([user_id, data]) => ({ user_id, ...data }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5)

      return NextResponse.json({
        today,
        week,
        month,
        topAgents: topAgentsList,
        topUsers: topUsersList,
        view: 'summary',
      })
    }

    // =======================================================================
    // TIMESERIES VIEW - For charts
    // =======================================================================
    if (view === 'timeseries') {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      
      let query = supabase
        .from('token_usage')
        .select(`
          recorded_at,
          agent_id,
          user_id,
          delta_total_tokens,
          delta_cost,
          total_tokens,
          cost_total,
          context_percent,
          request_count
        `)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true })

      if (agentFilter) query = query.eq('agent_id', agentFilter)
      if (userFilter) query = query.eq('user_id', userFilter)

      const { data, error } = await query

      if (error) throw error

      return NextResponse.json({
        data,
        view: 'timeseries',
        hours,
        count: data?.length || 0,
      })
    }

    // =======================================================================
    // DAILY VIEW - Daily aggregates
    // =======================================================================
    if (view === 'daily') {
      const since = new Date()
      since.setDate(since.getDate() - days)
      
      let query = supabase
        .from('token_usage_daily')
        .select('*')
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (agentFilter) query = query.eq('agent_id', agentFilter)
      if (userFilter) query = query.eq('user_id', userFilter)

      const { data, error } = await query

      if (error) throw error

      return NextResponse.json({
        data,
        view: 'daily',
        days,
        count: data?.length || 0,
      })
    }

    // =======================================================================
    // BY-AGENT VIEW - Breakdown by agent
    // =======================================================================
    if (view === 'by-agent') {
      const since = new Date()
      since.setDate(since.getDate() - days)

      const { data, error } = await supabase
        .from('token_usage_daily')
        .select('agent_id, date, total_tokens, total_cost, request_count, session_count')
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) throw error

      // Pivot by agent
      const byAgent = data?.reduce((acc, row) => {
        const agent = row.agent_id || 'unknown'
        if (!acc[agent]) {
          acc[agent] = {
            agent_id: agent,
            total_tokens: 0,
            total_cost: 0,
            request_count: 0,
            session_count: 0,
            daily: [],
          }
        }
        acc[agent].total_tokens += parseInt(row.total_tokens || '0')
        acc[agent].total_cost += parseFloat(row.total_cost || '0')
        acc[agent].request_count += row.request_count || 0
        acc[agent].session_count += row.session_count || 0
        acc[agent].daily.push({
          date: row.date,
          tokens: parseInt(row.total_tokens || '0'),
          cost: parseFloat(row.total_cost || '0'),
        })
        return acc
      }, {} as Record<string, any>) || {}

      return NextResponse.json({
        data: Object.values(byAgent).sort((a: any, b: any) => b.total_cost - a.total_cost),
        view: 'by-agent',
        days,
      })
    }

    // =======================================================================
    // BY-USER VIEW - Breakdown by user
    // =======================================================================
    if (view === 'by-user') {
      const since = new Date()
      since.setDate(since.getDate() - days)

      const { data, error } = await supabase
        .from('token_usage_daily')
        .select('user_id, date, total_tokens, total_cost, request_count, session_count')
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) throw error

      // Pivot by user
      const byUser = data?.reduce((acc, row) => {
        const user = row.user_id || 'unknown'
        if (!acc[user]) {
          acc[user] = {
            user_id: user,
            total_tokens: 0,
            total_cost: 0,
            request_count: 0,
            session_count: 0,
            daily: [],
          }
        }
        acc[user].total_tokens += parseInt(row.total_tokens || '0')
        acc[user].total_cost += parseFloat(row.total_cost || '0')
        acc[user].request_count += row.request_count || 0
        acc[user].session_count += row.session_count || 0
        acc[user].daily.push({
          date: row.date,
          tokens: parseInt(row.total_tokens || '0'),
          cost: parseFloat(row.total_cost || '0'),
        })
        return acc
      }, {} as Record<string, any>) || {}

      return NextResponse.json({
        data: Object.values(byUser).sort((a: any, b: any) => b.total_cost - a.total_cost),
        view: 'by-user',
        days,
      })
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 })

  } catch (error) {
    console.error('[Usage API Error]', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}
