import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PIPELINE_STEPS, getNextStep, getPrevBuildStep, calculateStatus } from "@/lib/pipeline-engine"

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

    let updates: any = {
      updated_at: new Date().toISOString(),
    }

    let activityContent = ""
    let activityEventType: "gate" | "revision" | "decision" = "gate"

    // Handle verdict logic
    if (body.verdict === "approve") {
      updates.needs_attention = false
      updates.attention_type = null

      // Special handling for spec phase → advance to design
      if (currentStepId === "spec") {
        const nextStep = getNextStep("spec")
        if (nextStep) {
          updates.current_step = nextStep.id
          updates.current_agent = nextStep.agent
          updates.status = calculateStatus(nextStep.id)
          activityContent = `Spec approved. Advancing to ${nextStep.label}`
        }
      }
      // Special handling for ship phase → trigger PR creation
      else if (currentStepId === "ship") {
        updates.status = "pr_submitted"
        activityContent = "Final review approved. Ready for PR creation."
        // TODO: Trigger PR creation workflow
      }
      // Generic approval
      else {
        const nextStep = getNextStep(currentStepId as any)
        if (nextStep) {
          updates.current_step = nextStep.id
          updates.current_agent = nextStep.agent
          updates.status = calculateStatus(nextStep.id)
          activityContent = `Approved. Advancing to ${nextStep.label}`
        } else {
          updates.status = "done"
          activityContent = "Final approval. Feature complete."
        }
      }

      activityEventType = "gate"
    } else if (body.verdict === "revise") {
      updates.needs_attention = false
      updates.attention_type = null

      // Return to previous build step
      const prevStep = getPrevBuildStep(currentStepId as any)
      if (prevStep) {
        updates.current_step = prevStep.id
        updates.current_agent = prevStep.agent
        updates.status = calculateStatus(prevStep.id)
      }

      // Increment revision count
      const revisionCount = (feature.revision_count || 0) + 1
      updates.revision_count = revisionCount

      if (revisionCount > 2) {
        // Max revisions exceeded - escalate
        updates.needs_attention = true
        updates.attention_type = "error"
        activityContent = `Revision requested (attempt ${revisionCount}). Max revisions exceeded - escalating.`
      } else {
        activityContent = `Revision requested (attempt ${revisionCount}). Returning to ${prevStep?.label || "previous step"}.`
      }

      activityEventType = "revision"
    } else if (body.verdict === "reject") {
      updates.status = "cancelled"
      updates.needs_attention = true
      updates.attention_type = "error"
      activityContent = "Feature rejected. Cancelled."
      activityEventType = "decision"
    }

    // Append to pipeline_log
    const pipelineLog = feature.pipeline_log || []
    pipelineLog.push({
      step: currentStepId,
      verdict: body.verdict,
      timestamp: new Date().toISOString(),
      feedback: body.feedback || null,
      revision_count: updates.revision_count || feature.revision_count || 0,
    })
    updates.pipeline_log = pipelineLog

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
      agent_id: feature.current_agent || "system",
      step_id: currentStepId,
      event_type: activityEventType,
      content: activityContent,
      metadata: {
        verdict: body.verdict,
        feedback: body.feedback || null,
        revision_count: updates.revision_count || feature.revision_count || 0,
      },
    })

    return NextResponse.json({ feature: updatedFeature }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
