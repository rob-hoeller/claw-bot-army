import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const VALID_EVENT_TYPES = [
  "thinking",
  "file_edit",
  "file_create",
  "command",
  "result",
  "decision",
  "handoff",
  "gate",
  "revision",
]

type ActivityEventPayload = {
  feature_id: string
  agent_id: string
  step_id: string
  event_type: string
  content: string
  metadata?: Record<string, unknown>
}

/**
 * POST /api/agent-activity
 * Agents write activity events
 */
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing Supabase credentials" },
      { status: 503 }
    )
  }

  try {
    const body = (await req.json()) as ActivityEventPayload

    // Validate required fields
    if (!body.feature_id || !body.agent_id || !body.step_id || !body.event_type || !body.content) {
      return NextResponse.json(
        { error: "Missing required fields: feature_id, agent_id, step_id, event_type, content" },
        { status: 400 }
      )
    }

    // Validate event_type
    if (!VALID_EVENT_TYPES.includes(body.event_type)) {
      return NextResponse.json(
        { error: `Invalid event_type. Must be one of: ${VALID_EVENT_TYPES.join(", ")}` },
        { status: 400 }
      )
    }

    const sb = createClient(supabaseUrl, supabaseKey)

    // Verify feature exists
    const { data: feature, error: featureError } = await sb
      .from("features")
      .select("id")
      .eq("id", body.feature_id)
      .single()

    if (featureError || !feature) {
      return NextResponse.json(
        { error: "Feature not found" },
        { status: 404 }
      )
    }

    // Insert activity event
    const { data: event, error: insertError } = await sb
      .from("agent_activity")
      .insert({
        feature_id: body.feature_id,
        agent_id: body.agent_id,
        step_id: body.step_id,
        event_type: body.event_type,
        content: body.content,
        metadata: body.metadata || {},
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/agent-activity
 * Fetch activity for a feature with optional filters
 * Query params: feature_id (required), step_id, agent_id, limit, before (cursor)
 */
export async function GET(req: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing Supabase credentials" },
      { status: 503 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const featureId = searchParams.get("feature_id")
    const stepId = searchParams.get("step_id")
    const agentId = searchParams.get("agent_id")
    const limit = parseInt(searchParams.get("limit") || "100", 10)
    const before = searchParams.get("before") // ISO timestamp for cursor pagination

    if (!featureId) {
      return NextResponse.json(
        { error: "Missing required query parameter: feature_id" },
        { status: 400 }
      )
    }

    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 1000" },
        { status: 400 }
      )
    }

    const sb = createClient(supabaseUrl, supabaseKey)

    // Build query
    let query = sb
      .from("agent_activity")
      .select("*")
      .eq("feature_id", featureId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (stepId) {
      query = query.eq("step_id", stepId)
    }

    if (agentId) {
      query = query.eq("agent_id", agentId)
    }

    if (before) {
      query = query.lt("created_at", before)
    }

    const { data: events, error: queryError } = await query

    if (queryError) {
      return NextResponse.json(
        { error: queryError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      events: events || [],
      count: events?.length || 0,
      has_more: events?.length === limit,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
