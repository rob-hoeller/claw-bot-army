import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PIPELINE_STEPS } from "@/lib/pipeline-engine"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type ReviewVerdictPayload = {
  verdict: "approve" | "revise" | "reject"
  feedback?: string
}

/**
 * POST /api/features/[id]/review-verdict
 * User approves/revises/rejects at human gates (spec review, final ship)
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
    const body = (await req.json()) as ReviewVerdictPayload

    // Validate verdict
    if (!["approve", "revise", "reject"].includes(body.verdict)) {
      return NextResponse.json(
        { error: "Invalid verdict. Must be: approve, revise, or reject" },
        { status: 400 }
      )
    }

    const sb = createClient(supabaseUrl, supabaseKey)

    // Fetch current feature
    const { data: feature, error: fetchError } = await sb
      .from("features")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !feature) {
      return NextResponse.json(
        { error: "Feature not found" },
        { status: 404 }
      )
    }

    const currentStepId = feature.current_step || "intake"
    const currentStep = PIPELINE_STEPS.find((s) => s.id === currentStepId)

    if (!currentStep) {
      return NextResponse.json(
        { error: "Invalid current step" },
        { status: 400 }
      )
    }

    // Verify this step has a human gate
    if (!currentStep.humanGate) {
      return NextResponse.json(
        { error: `Step '${currentStepId}' does not require human review` },
        { status: 400 }
      )
    }

    // Append to pipeline_log
    const pipelineLog = feature.pipeline_log || []
    pipelineLog.push({
      step: currentStepId,
      verdict: body.verdict,
      timestamp: new Date().toISOString(),
      feedback: body.feedback || null,
    })

    let updates: any = {
      pipeline_log: pipelineLog,
      updated_at: new Date().toISOString(),
    }

    let activityContent = ""
    let activityEventType: "gate" | "decision" = "gate"

    // Handle verdict logic
    if (body.verdict === "approve") {
      // Clear the gate flag - auto-advance will handle progression
      updates.needs_attention = false
      updates.attention_type = null

      if (currentStepId === "ship") {
        // Special case: ship approval means done
        updates.status = "pr_submitted"
        activityContent = "Final review approved. Ready for PR creation."
      } else {
        activityContent = `${currentStep.label} approved. Advancing pipeline...`
      }

      activityEventType = "gate"
    } else if (body.verdict === "revise") {
      // For revise, we'd need to go back, but for now just mark as needing attention
      updates.needs_attention = true
      updates.attention_type = "error"
      updates.revision_count = (feature.revision_count || 0) + 1
      activityContent = `Revision requested at ${currentStep.label}.`
      activityEventType = "decision"
    } else if (body.verdict === "reject") {
      updates.status = "cancelled"
      updates.needs_attention = true
      updates.attention_type = "error"
      activityContent = "Feature rejected. Cancelled."
      activityEventType = "decision"
    }

    // Update feature
    const { data: updatedFeature, error: updateError } = await sb
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

    // Write activity event
    await sb.from("agent_activity").insert({
      feature_id: id,
      agent_id: feature.current_agent || "HBx",
      step_id: currentStepId,
      event_type: activityEventType,
      action_type: activityEventType,
      content: activityContent,
      metadata: {
        verdict: body.verdict,
        feedback: body.feedback || null,
      },
    })

    // If approved and not at ship, trigger auto-advance to continue pipeline
    if (body.verdict === "approve" && currentStepId !== "ship") {
      try {
        const autoAdvanceUrl = new URL(`/api/features/${id}/auto-advance`, req.url)
        
        // Fire and forget - don't wait for pipeline to complete
        fetch(autoAdvanceUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }).catch((err) => {
          console.error("Failed to trigger auto-advance:", err)
        })
      } catch (advanceError) {
        console.error("Error triggering auto-advance:", advanceError)
        // Don't fail the review if auto-advance trigger fails
      }
    }

    return NextResponse.json({ feature: updatedFeature }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
