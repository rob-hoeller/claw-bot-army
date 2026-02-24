import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getClient() {
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = getClient()
  if (!sb) return NextResponse.json({ error: "Server misconfiguration" }, { status: 503 })

  const { data: epic, error } = await sb
    .from("epics")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !epic) return NextResponse.json({ error: "Epic not found" }, { status: 404 })

  // Get linked features
  const { data: links } = await sb
    .from("epic_features")
    .select("feature_id, sort_order, features(*)")
    .eq("epic_id", id)
    .order("sort_order", { ascending: true })

  const features = (links || [])
    .map((l: Record<string, unknown>) => l.features)
    .filter(Boolean)

  return NextResponse.json({ ...epic, features })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = getClient()
  if (!sb) return NextResponse.json({ error: "Server misconfiguration" }, { status: 503 })

  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.status !== undefined) updates.status = body.status
  if (body.color !== undefined) updates.color = body.color
  if (body.owner !== undefined) updates.owner = body.owner

  const { data, error } = await sb
    .from("epics")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ epic: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = getClient()
  if (!sb) return NextResponse.json({ error: "Server misconfiguration" }, { status: 503 })

  const { error } = await sb.from("epics").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
