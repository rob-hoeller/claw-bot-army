import { NextRequest, NextResponse } from "next/server"
import { advanceFeature } from "@/lib/pipeline-engine"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type AdvancePayload = {
  verdict: "approve" | "revise" | "reject"
  notes?: string
}

/**
 * POST /api/features/[id]/advance
 * Advances feature to next pipeline phase based on verdict
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing Supabase credentials" },
      { status: 503 }
    )
  }

  try {
    const body = (await req.json()) as AdvancePayload

    // Validate verdict
    if (!["approve", "revise", "reject"].includes(body.verdict)) {
      return NextResponse.json(
        { error: "Invalid verdict. Must be: approve, revise, or reject" },
        { status: 400 }
      )
    }

    // Use pipeline engine to advance
    const result = await advanceFeature(id, body.verdict, body.notes)

    if (!result.success || !result.feature) {
      return NextResponse.json(
        { error: result.error || "Failed to advance feature" },
        { status: 500 }
      )
    }

    // Write activity event for the transition
    const sb = createClient(supabaseUrl, supabaseKey)
    
    const feature = result.feature
    const eventType = body.verdict === "approve" ? "handoff" : "revision"
    const content =
      body.verdict === "approve"
        ? `Approved. Advancing to ${feature.current_step || "next phase"}`
        : body.verdict === "revise"
        ? `Revision requested. Returning to ${feature.current_step}`
        : "Rejected. Feature cancelled."

    await sb.from("agent_activity").insert({
      feature_id: id,
      agent_id: feature.current_agent || "system",
      step_id: feature.current_step || "unknown",
      event_type: eventType,
      content,
      metadata: {
        verdict: body.verdict,
        notes: body.notes || null,
        revision_count: feature.revision_count || 0,
      },
    })

    return NextResponse.json({ feature: result.feature }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
