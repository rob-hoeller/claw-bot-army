import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/metrics
 * 
 * Fetch platform metrics for dashboard charts
 * 
 * Query params:
 * - hours: Number of hours to fetch (default: 24)
 * - summary: If true, return daily summaries instead of raw data
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
    const hours = parseInt(searchParams.get('hours') || '24')
    const summary = searchParams.get('summary') === 'true'

    if (summary) {
      // Return daily summaries
      const { data, error } = await supabase
        .from('metrics_summary')
        .select('*')
        .order('date', { ascending: false })
        .limit(30)

      if (error) throw error
      return NextResponse.json({ data, type: 'summary' })
    }

    // Return raw metrics for charting
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('platform_metrics')
      .select(`
        recorded_at,
        cpu_percent,
        mem_percent,
        load_percent,
        session_count,
        gateway_status,
        gateway_latency_ms
      `)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })

    if (error) throw error

    // Calculate current stats
    const latest = data?.[data.length - 1]
    const stats = data && data.length > 0 ? {
      cpu: {
        current: latest?.cpu_percent || 0,
        avg: Math.round((data.reduce((sum, d) => sum + (d.cpu_percent || 0), 0) / data.length) * 10) / 10,
        max: Math.max(...data.map(d => d.cpu_percent || 0))
      },
      memory: {
        current: latest?.mem_percent || 0,
        avg: Math.round((data.reduce((sum, d) => sum + (d.mem_percent || 0), 0) / data.length) * 10) / 10,
        max: Math.max(...data.map(d => d.mem_percent || 0))
      },
      load: {
        current: latest?.load_percent || 0,
        avg: Math.round((data.reduce((sum, d) => sum + (d.load_percent || 0), 0) / data.length) * 10) / 10,
        max: Math.max(...data.map(d => d.load_percent || 0))
      },
      sessions: {
        current: latest?.session_count || 0,
        avg: Math.round((data.reduce((sum, d) => sum + (d.session_count || 0), 0) / data.length) * 10) / 10,
        max: Math.max(...data.map(d => d.session_count || 0))
      },
      gateway: {
        status: latest?.gateway_status || 'unknown',
        latency: latest?.gateway_latency_ms || 0,
        uptime: Math.round((data.filter(d => d.gateway_status === 'ok').length / data.length) * 100)
      },
      samples: data.length,
      period: {
        from: data[0]?.recorded_at,
        to: latest?.recorded_at
      }
    } : null

    return NextResponse.json({
      data,
      stats,
      type: 'timeseries',
      hours
    })

  } catch (error) {
    console.error('[Metrics API Error]', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/metrics/alerts
 * 
 * Fetch recent alerts (threshold violations)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'alerts') {
      if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server misconfiguration: Supabase environment variables not set. Contact admin.' }, { status: 503 })
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const { data, error } = await supabase
        .from('metrics_alerts')
        .select('*')
        .limit(20)

      if (error) throw error
      return NextResponse.json({ alerts: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (error) {
    console.error('[Metrics API Error]', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
