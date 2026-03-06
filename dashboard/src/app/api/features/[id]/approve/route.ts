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
      { error: "Server misconfiguration: missing required environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY). Contact admin." },
      { status: 503 }
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

    // Write handoff packet for approval (review → approved)
    if (target_status === "approved" && approved_by) {
      try {
        const now = new Date().toISOString()
        await sb.from("handoff_packets").insert({
          feature_id: id,
          phase: "approved",
          version: 1,
          agent_id: approved_by.toLowerCase().replace(/\s+/g, "-"),
          agent_name: approved_by,
          agent_type: "human",
          status: "completed",
          started_at: now,
          completed_at: now,
          output_summary: `${approved_by} approved this feature for PR submission.`,
          output_artifacts: [],
          output_decisions: [{ question: "Approve for PR?", chosen: "Approved", alternatives: ["Revise", "Reject"], rationale: "Reviewed and approved", decided_by: approved_by }],
          activity_log: [{ timestamp: now, actor: { id: approved_by.toLowerCase().replace(/\s+/g, "-"), type: "human", name: approved_by }, action: `${approved_by} approved at ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`, detail: {} }],
        })
      } catch (handoffErr) {
        console.error("[API] Approval handoff packet error:", handoffErr)
      }
    }

    // If feature has pipeline state, sync current_step/current_agent and trigger run-pipeline
    if (data.current_step) {
      const stepToAgentMap: Record<string, { step: string; agent: string }> = {
        design_review: { step: 'design', agent: 'HBx_IN5' },
        in_progress: { step: 'build', agent: 'HBx_IN2' },
        qa_review: { step: 'qa', agent: 'HBx_IN6' },
        review: { step: 'ship', agent: 'HBx' },
      }
      const mapping = stepToAgentMap[target_status]
      if (mapping) {
        await sb.from("features").update({
          current_step: mapping.step,
          current_agent: mapping.agent,
          needs_attention: false,
          attention_type: null,
        }).eq("id", id)

        // Trigger pipeline to continue from the new step
        try {
          const runPipelineUrl = new URL(`/api/features/${id}/run-pipeline`, req.url)
          fetch(runPipelineUrl.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }).catch((err) => {
            console.error("[API] Failed to trigger run-pipeline:", err)
          })
        } catch (pipelineErr) {
          console.error("[API] Error triggering pipeline:", pipelineErr)
        }
      }

      // Write audit trail activity for the approval
      try {
        await sb.from("agent_activity").insert({
          feature_id: id,
          agent_id: approved_by || "system",
          action_type: "approve",
          step_id: data.current_step,
          event_type: "gate_passed",
          content: `${approved_by || "System"} approved at ${data.current_step}. Advancing to ${mapping?.step || target_status}.`,
          metadata: {
            from_step: data.current_step,
            to_step: mapping?.step || target_status,
            approved_by: approved_by,
            timestamp: new Date().toISOString(),
          },
        })
      } catch (actErr) {
        console.error("[API] Approval activity error:", actErr)
      }
    }

    // Fire-and-forget gateway notification for pipeline routing
    const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL
    const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN
    if (GATEWAY_URL && GATEWAY_TOKEN && data) {
      const notifyStatuses = ['design_review', 'in_progress', 'review', 'approved']
      if (notifyStatuses.includes(target_status)) {
        let notificationContent: string
        if (target_status === 'approved') {
          notificationContent = `✅ Feature "${data.title}" (ID: ${id}) has been APPROVED by ${approved_by || 'Lance'}. Please create a PR from branch "${data.branch_name || 'unknown'}" to main, assign reviewers rob-hoeller and RobLepard, and update the feature status to pr_submitted.`
        } else {
          notificationContent = `Feature "${data.title}" (${id}) has been approved and moved to ${target_status.replace(/_/g, ' ')}. It has been auto-assigned to ${autoAssignMap[target_status] || 'the next agent'}. Please route accordingly.`
        }

        const sendGatewayNotification = () =>
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
                content: notificationContent,
              }],
            }),
          })

        // Fire with 1 retry after 5s on failure
        sendGatewayNotification().catch(() => {
          setTimeout(() => {
            sendGatewayNotification().catch((err) => {
              console.error('[API] Gateway notification failed (retry) for feature:', id, err)
            })
          }, 5000)
        })
      }
    }

    return NextResponse.json({ feature: data })
  } catch (err) {
    console.error("[API] Feature approve exception:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
