import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey)
}

const VALID_STATUSES = [
  "planning",
  "design_review",
  "in_progress",
  "qa_review",
  "review",
  "approved",
  "pr_submitted",
  "done",
  "cancelled",
]

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await req.json()
    const { target_status, approved_by } = body

    if (!target_status || !VALID_STATUSES.includes(target_status)) {
      return NextResponse.json(
        { error: `Invalid target_status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      )
    }

    const sb = getSupabase()

    const updates: Record<string, unknown> = {
      status: target_status,
      updated_at: new Date().toISOString(),
    }

    if (approved_by) {
      updates.approved_by = approved_by
      updates.approved_at = new Date().toISOString()
    }

    if (target_status === "in_progress") {
      updates.started_at = new Date().toISOString()
    }
    if (target_status === "done") {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await sb
      .from("features")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[API] Feature approve error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Post approval message to bridge chat
    try {
      await sb.from("work_item_messages").insert({
        work_item_id: id,
        sender_type: "orchestrator",
        sender_id: approved_by || "system",
        sender_name: approved_by || "System",
        content: `✅ **Approved** — moved to **${target_status.replace(/_/g, " ")}** by ${approved_by || "system"}`,
      })
    } catch (msgErr) {
      console.error("[API] Approval message error:", msgErr)
    }

    return NextResponse.json({ feature: data })
  } catch (err) {
    console.error("[API] Feature approve exception:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
