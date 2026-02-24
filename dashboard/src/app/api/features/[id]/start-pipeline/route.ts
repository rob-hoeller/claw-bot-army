import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    const sb = createClient(supabaseUrl, supabaseKey)

    // Verify feature exists and is in planning
    const { data: feature, error: fetchErr } = await sb
      .from("features")
      .select("id, status, title")
      .eq("id", id)
      .single()

    if (fetchErr || !feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 })
    }

    if (feature.status !== "planning") {
      return NextResponse.json(
        { error: `Cannot start pipeline: feature is in '${feature.status}', expected 'planning'` },
        { status: 400 }
      )
    }

    const { data, error } = await sb
      .from("features")
      .update({
        status: "design_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Post notification to bridge chat
    try {
      await sb.from("work_item_messages").insert({
        work_item_id: id,
        sender_type: "orchestrator",
        sender_id: "system",
        sender_name: "System",
        content: `🚀 **Pipeline started** — feature moved to **Design Review**`,
      })
    } catch {
      // non-critical
    }

    // Fire-and-forget gateway notification
    const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL
    const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN
    if (GATEWAY_URL && GATEWAY_TOKEN && data) {
      fetch(`${GATEWAY_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GATEWAY_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openclaw:HBx",
          messages: [{
            role: "user",
            content: `🚀 Pipeline triggered for feature "${data.title}" (ID: ${id}). Status changed to design_review. Please route this feature through the build pipeline.`,
          }],
        }),
      }).catch(() => {})
    }

    return NextResponse.json({ feature: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
