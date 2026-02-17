import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/global-knowledge — list all docs
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('global_knowledge')
    .select('id, slug, title, category, version, updated_by, updated_at')
    .order('title')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/global-knowledge — create new doc
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { slug, title, content, category, updated_by } = body

  if (!slug || !title) {
    return NextResponse.json({ error: 'slug and title are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('global_knowledge')
    .insert({ slug, title, content: content || '', category, updated_by })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
