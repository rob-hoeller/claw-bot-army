import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('platform_config')
      .select('config, updated_at')
      .eq('id', 'current')
      .single()

    if (error) throw error

    return NextResponse.json({
      config: data.config,
      fetchedAt: data.updated_at,
    })
  } catch (err) {
    console.error('[Config API Error]', err)
    return NextResponse.json(
      { error: 'Failed to fetch config', detail: String(err) },
      { status: 500 }
    )
  }
}
