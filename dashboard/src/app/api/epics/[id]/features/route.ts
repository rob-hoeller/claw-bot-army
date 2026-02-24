import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getClient() {
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: epicId } = await params
  const sb = getClient()
  if (!sb) return NextResponse.json({ error: "Server misconfiguration" }, { status: 503 })

  const body = await req.json()
  if (!body.feature_id) {
    return NextResponse.json({ error: "feature_id is required" }, { status: 400 })
  }

  // Upsert — idempotent
  const { data, error } = await sb
    .from("epic_features")
    .upsert(
      { epic_id: epicId, feature_id: body.feature_id, sort_order: body.sort_order || 0 },
      { onConflict: "epic_id,feature_id" }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ link: data }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: epicId } = await params
  const sb = getClient()
  if (!sb) return NextResponse.json({ error: "Server misconfiguration" }, { status: 503 })

  const body = await req.json()
  if (!body.feature_id) {
    return NextResponse.json({ error: "feature_id is required" }, { status: 400 })
  }

  const { error } = await sb
    .from("epic_features")
    .delete()
    .eq("epic_id", epicId)
    .eq("feature_id", body.feature_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
