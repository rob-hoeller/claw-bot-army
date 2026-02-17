import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/global-knowledge/[slug]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const { data, error } = await supabaseAdmin
    .from('global_knowledge')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PUT /api/global-knowledge/[slug]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json()
  const { title, content, category, updated_by } = body

  // Fetch current version
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('global_knowledge')
    .select('version')
    .eq('slug', slug)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {
    version: (current.version || 1) + 1,
    updated_at: new Date().toISOString(),
  }
  if (title !== undefined) updates.title = title
  if (content !== undefined) updates.content = content
  if (category !== undefined) updates.category = category
  if (updated_by !== undefined) updates.updated_by = updated_by

  const { data, error } = await supabaseAdmin
    .from('global_knowledge')
    .update(updates)
    .eq('slug', slug)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
