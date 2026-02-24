import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getClient() {
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}

export async function GET() {
  const sb = getClient()
  if (!sb) return NextResponse.json({ error: "Server misconfiguration" }, { status: 503 })

  // Get epics with feature counts
  const { data: epics, error } = await sb
    .from("epics")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get feature counts per epic
  const epicIds = (epics || []).map((e: Record<string, unknown>) => e.id as string)
  let featureCounts: Record<string, { total: number; done: number }> = {}

  if (epicIds.length > 0) {
    const { data: links } = await sb
      .from("epic_features")
      .select("epic_id, feature_id, features(status)")
      .in("epic_id", epicIds)

    if (links) {
      for (const link of links as unknown as Array<{ epic_id: string; features: { status: string } | null }>) {
        if (!featureCounts[link.epic_id]) {
          featureCounts[link.epic_id] = { total: 0, done: 0 }
        }
        featureCounts[link.epic_id].total++
        if (link.features?.status === "done") {
          featureCounts[link.epic_id].done++
        }
      }
    }
  }

  const result = (epics || []).map((epic: Record<string, unknown>) => ({
    ...epic,
    feature_count: featureCounts[epic.id as string]?.total || 0,
    features_done: featureCounts[epic.id as string]?.done || 0,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const sb = getClient()
  if (!sb) return NextResponse.json({ error: "Server misconfiguration" }, { status: 503 })

  const body = await req.json()
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const { data, error } = await sb
    .from("epics")
    .insert({
      title: body.title.trim(),
      description: body.description || null,
      color: body.color || "#8B5CF6",
      owner: body.owner || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ epic: data }, { status: 201 })
}
