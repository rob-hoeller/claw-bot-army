import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const VALID_PRIORITIES = ["low", "medium", "high", "urgent"]

type SubmitPayload = {
  title?: string
  description?: string
  priority?: "low" | "medium" | "high" | "urgent"
  attachments?: string[]
}

/**
 * POST /api/features/[id]/submit
 * User submits a feature (either new or draft) to start the pipeline
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
    const body = (await req.json()) as SubmitPayload

    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { error: "Invalid priority" },
        { status: 400 }
      )
    }

    const sb = createClient(supabaseUrl, supabaseKey)

    // Check if feature exists
    const { data: existing, error: fetchError } = await sb
      .from("features")
      .select("id, title")
      .eq("id", id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Feature not found" },
        { status: 404 }
      )
    }

    // Update feature with submission state
    const updates: any = {
      status: "planning",
      current_step: "intake",
      current_agent: "HBx",
      needs_attention: false,
      updated_at: new Date().toISOString(),
    }

    if (body.title) updates.title = body.title.trim()
    if (body.description !== undefined) updates.description = body.description
    if (body.priority) updates.priority = body.priority

    // Append to pipeline_log
    const { data: currentFeature } = await sb
      .from("features")
      .select("pipeline_log")
      .eq("id", id)
      .single()

    const pipelineLog = currentFeature?.pipeline_log || []
    pipelineLog.push({
      step: "intake",
      timestamp: new Date().toISOString(),
      notes: "Feature submitted via CommandBar",
    })
    updates.pipeline_log = pipelineLog

    const { data: feature, error: updateError } = await sb
      .from("features")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // Write initial agent activity event
    const activityPayload = {
      feature_id: feature.id,
      agent_id: "HBx",
      step_id: "intake",
      event_type: "thinking",
      content: "Feature submitted. Routing to architect...",
      metadata: {
        title: feature.title,
        priority: feature.priority,
        has_attachments: !!body.attachments?.length,
      },
    }

    await sb.from("agent_activity").insert(activityPayload)

    return NextResponse.json({ feature }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
