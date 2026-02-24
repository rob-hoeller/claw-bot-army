import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase service role key is not configured")
  }
  return createClient(supabaseUrl, supabaseKey)
}

const PHASE_MAP: Record<string, { label: string; order: number }> = {
  planning: { label: "Planning", order: 1 },
  design_review: { label: "Design Review", order: 2 },
  in_progress: { label: "In Progress", order: 3 },
  qa_review: { label: "QA Review", order: 4 },
  review: { label: "Review", order: 5 },
  approved: { label: "Approved", order: 6 },
  pr_submitted: { label: "PR Submitted", order: 7 },
  done: { label: "Done", order: 8 },
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing required environment variables." },
      { status: 503 }
    )
  }

  try {
    const sb = getSupabase()

    const { data, error } = await sb
      .from("handoff_packets")
      .select("*")
      .eq("feature_id", id)
      .order("started_at", { ascending: true })
      .order("version", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sort by pipeline phase order
    const phaseOrder: Record<string, number> = {
      planning: 1, design_review: 2, in_progress: 3, qa_review: 4,
      review: 5, approved: 6, pr_submitted: 7, done: 8,
    }
    const sorted = (data ?? []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const oa = phaseOrder[a.phase as string] ?? 99
      const ob = phaseOrder[b.phase as string] ?? 99
      if (oa !== ob) return oa - ob
      return ((a.version as number) ?? 0) - ((b.version as number) ?? 0)
    })

    return NextResponse.json(sorted)
  } catch (err) {
    console.error("[API] Handoff packets GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function isJsonArray(val: unknown): val is unknown[] {
  return Array.isArray(val)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: featureId } = await params

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing required environment variables." },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()
    const { phase } = body

    // Validate phase
    if (!phase || !PHASE_MAP[phase]) {
      return NextResponse.json(
        { error: `Invalid or missing phase. Must be one of: ${Object.keys(PHASE_MAP).join(", ")}` },
        { status: 400 }
      )
    }

    // Required field validation (#3)
    const missing: string[] = []
    if (!body.agent_id) missing.push("agent_id")
    if (!body.agent_name) missing.push("agent_name")
    if (!body.output_summary) missing.push("output_summary")
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      )
    }

    // JSONB array validation (#7)
    const arrayFields = {
      output_artifacts: body.output_artifacts,
      output_decisions: body.output_decisions,
      activity_log: body.activity_log,
    }
    for (const [field, val] of Object.entries(arrayFields)) {
      if (val !== undefined && val !== null && !isJsonArray(val)) {
        return NextResponse.json(
          { error: `${field} must be an array if provided` },
          { status: 400 }
        )
      }
    }

    const sb = getSupabase()

    // Validate feature exists
    const { data: feature, error: featureErr } = await sb
      .from("features")
      .select("id")
      .eq("id", featureId)
      .single()

    if (featureErr || !feature) {
      return NextResponse.json(
        { error: "Feature not found" },
        { status: 404 }
      )
    }

    const phaseInfo = PHASE_MAP[phase]

    // Calculate version
    const { count, error: countErr } = await sb
      .from("handoff_packets")
      .select("*", { count: "exact", head: true })
      .eq("feature_id", featureId)
      .eq("phase", phase)

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 })
    }

    const version = (count ?? 0) + 1

    // Find previous version ID if applicable
    let previous_version_id: string | null = null
    if (version > 1) {
      const { data: prevPacket } = await sb
        .from("handoff_packets")
        .select("id")
        .eq("feature_id", featureId)
        .eq("phase", phase)
        .order("version", { ascending: false })
        .limit(1)
        .single()

      if (prevPacket) {
        previous_version_id = prevPacket.id
      }
    }

    // Auto-link input_source_packet_id (#6)
    let input_source_packet_id: string | null = body.input_source_packet_id ?? null
    if (!input_source_packet_id && phaseInfo.order > 1) {
      const { data: priorPacket } = await sb
        .from("handoff_packets")
        .select("id")
        .eq("feature_id", featureId)
        .eq("phase_order", phaseInfo.order - 1)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .single()

      if (priorPacket) {
        input_source_packet_id = priorPacket.id
      }
    }

    // Auto-calculate duration_ms (#5)
    let duration_ms: number | null = body.duration_ms ?? null
    if (duration_ms === null && body.started_at && body.completed_at) {
      duration_ms = new Date(body.completed_at).getTime() - new Date(body.started_at).getTime()
    }

    // Truncate output_summary to 10,000 chars (#8)
    let output_summary: string = body.output_summary
    if (output_summary.length > 10_000) {
      output_summary = output_summary.slice(0, 10_000)
    }

    const insertPayload = {
      feature_id: featureId,
      phase,
      phase_label: phaseInfo.label,
      phase_order: phaseInfo.order,
      version,
      previous_version_id,
      agent_id: body.agent_id,
      agent_name: body.agent_name,
      agent_type: body.agent_type ?? null,
      output_summary,
      output_artifacts: body.output_artifacts ?? [],
      output_decisions: body.output_decisions ?? [],
      output_metrics: body.output_metrics ?? null,
      activity_log: body.activity_log ?? [],
      input_source_phase: body.input_source_phase ?? null,
      input_source_packet_id,
      input_context: body.input_context ?? null,
      started_at: body.started_at ?? null,
      completed_at: body.completed_at ?? new Date().toISOString(),
      duration_ms,
      cost_usd: body.cost_usd ?? null,
      cost_tokens_in: body.cost_tokens_in ?? null,
      cost_tokens_out: body.cost_tokens_out ?? null,
      rejection_reason: body.rejection_reason ?? null,
      diff_from_previous: body.diff_from_previous ?? null,
      status: body.status ?? "completed",
    }

    const { data: packet, error: insertErr } = await sb
      .from("handoff_packets")
      .insert(insertPayload)
      .select()
      .single()

    if (insertErr) {
      console.error("[API] Handoff packet insert error:", insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json(
      { packet, phase_order: phaseInfo.order, phase_label: phaseInfo.label },
      { status: 201 }
    )
  } catch (err) {
    console.error("[API] Handoff packets POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
