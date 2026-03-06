import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PIPELINE_STEPS, getNextStep, calculateStatus, type PipelineStepId } from "@/lib/pipeline-engine"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Write an audit-trail activity event to Supabase
 */
async function writeActivity(
  sb: any,
  featureId: string,
  agentId: string,
  stepId: string,
  actionType: string,
  eventType: string,
  content: string,
  metadata: Record<string, unknown> = {}
) {
  const stepDef = PIPELINE_STEPS.find((s) => s.id === stepId)
  const agentName = stepDef?.label || agentId

  const { error } = await sb.from("agent_activity").insert({
    feature_id: featureId,
    agent_id: agentId,
    step_id: stepId,
    action_type: actionType,
    event_type: eventType,
    content,
    metadata: {
      ...metadata,
      agent_name: agentName,
      pipeline_step: stepId,
      audit: {
        actor: agentId,
        actor_name: agentName,
        action: actionType,
        step: stepId,
        recorded_at: new Date().toISOString(),
      },
    },
  })

  if (error) {
    console.error(`[run-pipeline] Failed to write activity for ${stepId}:`, error)
  }
}

/**
 * Send a task to an HBx agent via the OpenClaw gateway
 */
async function notifyAgent(
  agentId: string,
  message: string,
  featureId: string
): Promise<boolean> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN

  if (!gatewayUrl || !gatewayToken) {
    console.error("[run-pipeline] Gateway not configured — cannot notify agent", agentId)
    return false
  }

  try {
    const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gatewayToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `openclaw:${agentId}`,
        messages: [{ role: "user", content: message }],
      }),
    })

    if (!res.ok) {
      console.error(`[run-pipeline] Gateway returned ${res.status} for agent ${agentId}`)
      return false
    }

    return true
  } catch (err) {
    console.error(`[run-pipeline] Failed to notify agent ${agentId}:`, err)
    return false
  }
}

/**
 * Build a context-rich task message for an agent at a given pipeline step
 */
function buildAgentTask(feature: Record<string, unknown>, step: typeof PIPELINE_STEPS[number]): string {
  const base = `Pipeline task for feature "${feature.title}" (ID: ${feature.id}).`
  const spec = feature.feature_spec ? `\n\nSpec:\n${feature.feature_spec}` : ""
  const acceptance = feature.acceptance_criteria ? `\n\nAcceptance Criteria:\n${feature.acceptance_criteria}` : ""
  const desc = feature.description ? `\n\nDescription: ${feature.description}` : ""

  const stepInstructions: Record<string, string> = {
    intake: `${base}\n\nYou are handling INTAKE. Classify priority/complexity, validate the request, and prepare a routing packet for the next agent. When done, call the advance API to move to spec.${desc}`,
    spec: `${base}\n\nYou are handling SPECIFICATION. Analyze the request, review relevant codebase, write a technical spec with acceptance criteria. When done, the pipeline will pause for human approval.${desc}`,
    design: `${base}\n\nYou are handling DESIGN. Create component hierarchy, data flow, and UI patterns based on the approved spec. When done, call the advance API to move to build.${spec}${acceptance}`,
    build: `${base}\n\nYou are handling BUILD. Implement the feature per the spec and design. Run typecheck. When done, call the advance API to move to QA.${spec}${acceptance}`,
    qa: `${base}\n\nYou are handling QA. Run typecheck, lint, review code quality, check for regressions. If issues found, call advance with verdict=revise. If all clear, call advance with verdict=approve.${spec}${acceptance}`,
    ship: `${base}\n\nYou are handling SHIP. Create a PR from the feature branch, assign reviewers rob-hoeller and RobLepard, and update the feature with the PR URL. The pipeline will pause for human approval to merge.${spec}`,
  }

  return stepInstructions[step.id] || base
}

/**
 * POST /api/features/[id]/run-pipeline
 *
 * Drives a feature through the pipeline by notifying the assigned agent
 * at each step via the OpenClaw gateway. Advances automatically through
 * non-human-gate steps. Pauses at human gates (spec, ship).
 *
 * This is the REAL pipeline — agents do actual work via gateway calls.
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
    const sb = createClient(supabaseUrl, supabaseKey)

    // Fetch feature
    const { data: feature, error: fetchError } = await sb
      .from("features")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 })
    }

    const currentStepId = (feature.current_step || "intake") as PipelineStepId
    const currentStep = PIPELINE_STEPS.find((s) => s.id === currentStepId)

    if (!currentStep) {
      return NextResponse.json({ error: "Invalid current step" }, { status: 400 })
    }

    // If already at a human gate with needs_attention, don't re-run
    if (currentStep.humanGate && feature.needs_attention) {
      return NextResponse.json(
        { message: "Awaiting human review at gate", step: currentStepId, feature },
        { status: 200 }
      )
    }

    // Write activity: pipeline starting/resuming at this step
    await writeActivity(
      sb, id, currentStep.agent, currentStepId,
      "route", "start",
      `Pipeline active: ${currentStep.label} (${currentStep.agent}). Notifying agent.`
    )

    // Notify the assigned agent via gateway
    const task = buildAgentTask(feature, currentStep)
    const notified = await notifyAgent(currentStep.agent, task, id)

    if (!notified) {
      // Gateway failed — log it but don't block the pipeline
      await writeActivity(
        sb, id, "system", currentStepId,
        "error", "warning",
        `Gateway notification failed for ${currentStep.agent}. Agent may need manual trigger.`,
        { gateway_error: true }
      )
    } else {
      await writeActivity(
        sb, id, currentStep.agent, currentStepId,
        "notify", "progress",
        `${currentStep.agent} notified via gateway. Agent is working.`,
        { notified: true, agent: currentStep.agent }
      )
    }

    // If this is a human gate step, set needs_attention and stop
    if (currentStep.humanGate) {
      const pipelineLog = feature.pipeline_log || []
      pipelineLog.push({
        step: currentStepId,
        agent: currentStep.agent,
        agent_name: currentStep.label,
        verdict: "awaiting_review",
        timestamp: new Date().toISOString(),
        notes: `${currentStep.label} — awaiting human approval`,
      })

      await sb.from("features").update({
        needs_attention: true,
        attention_type: "review",
        status: calculateStatus(currentStepId),
        pipeline_log: pipelineLog,
        updated_at: new Date().toISOString(),
      }).eq("id", id)

      await writeActivity(
        sb, id, currentStep.agent, currentStepId,
        "gate", "gate",
        `Human gate reached: ${currentStep.label}. Awaiting approval.`
      )
    }

    // Fetch final state
    const { data: finalFeature } = await sb
      .from("features")
      .select("*")
      .eq("id", id)
      .single()

    return NextResponse.json({
      feature: finalFeature,
      step: currentStepId,
      agent: currentStep.agent,
      notified,
      gate: currentStep.humanGate,
    }, { status: 200 })

  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
