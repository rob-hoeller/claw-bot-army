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

export async function PATCH(
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
    const { status, assigned_to } = body

    // Build update payload — supports status, assigned_to, or both
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        )
      }
      updates.status = status
      // Auto-set timestamps
      if (status === "done") updates.completed_at = new Date().toISOString()
      if (status === "in_progress" && !body.skipStarted) updates.started_at = new Date().toISOString()
      if (status === "cancelled") updates.completed_at = new Date().toISOString()
    }

    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to || null
    }

    const sb = getSupabase()
    const { data, error } = await sb
      .from("features")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[API] Feature update error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If reassigned, post a context handoff message to bridge chat
    if (assigned_to !== undefined && assigned_to) {
      try {
        // Fetch recent bridge messages for context
        const { data: messages } = await sb
          .from("work_item_messages")
          .select("sender_name, content, created_at")
          .eq("work_item_id", id)
          .order("created_at", { ascending: false })
          .limit(10)

        const contextSummary = messages && messages.length > 0
          ? messages.reverse().map(m => `[${m.sender_name}]: ${m.content}`).join("\n")
          : "No previous messages."

        // Post handoff message
        await sb.from("work_item_messages").insert({
          work_item_id: id,
          sender_type: "orchestrator",
          sender_id: "HBx",
          sender_name: "HBx (Orchestrator)",
          content: `🔄 **Task reassigned to ${assigned_to}**\n\n**Context handoff — recent conversation:**\n${contextSummary}\n\n${assigned_to}, you're now assigned to this task. Review the context above and continue where the previous agent left off.`,
        })
      } catch (handoffErr) {
        // Non-fatal — log but don't fail the update
        console.error("[API] Handoff message error:", handoffErr)
      }
    }

    return NextResponse.json({ feature: data })
  } catch (err) {
    console.error("[API] Feature update exception:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
