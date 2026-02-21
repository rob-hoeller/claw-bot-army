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

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
      { status: 500 }
    )
  }

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

    // Auto-assign based on pipeline stage transitions
    const autoAssignMap: Record<string, string> = {
      design_review: 'HBx_IN5',   // spec approved → design agent
      in_progress: 'HBx_IN2',     // design approved → build agent
      review: 'HBx',              // QA passed → orchestrator review
    }
    if (autoAssignMap[target_status]) {
      updates.assigned_to = autoAssignMap[target_status]
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

    // Fire-and-forget gateway notification for pipeline routing
    const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL
    const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN
    if (GATEWAY_URL && GATEWAY_TOKEN && data) {
      const notifyStatuses = ['design_review', 'in_progress', 'review']
      if (notifyStatuses.includes(target_status)) {
        fetch(`${GATEWAY_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GATEWAY_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openclaw:HBx',
            messages: [{
              role: 'user',
              content: `Feature "${data.title}" (${id}) has been approved and moved to ${target_status.replace(/_/g, ' ')}. It has been auto-assigned to ${autoAssignMap[target_status] || 'the next agent'}. Please route accordingly.`,
            }],
          }),
        }).catch(() => {
          // Gateway notification is best-effort
        })
      }
    }

    return NextResponse.json({ feature: data })
  } catch (err) {
    console.error("[API] Feature approve exception:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
