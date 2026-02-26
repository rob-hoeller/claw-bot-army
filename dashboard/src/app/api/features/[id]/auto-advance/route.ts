import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getNextStep, calculateStatus } from "@/lib/pipeline-engine"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * POST /api/features/[id]/auto-advance
 * Resume pipeline processing after human approval at a gate
 * 
 * This endpoint is called after a user approves at spec or ship gates.
 * It advances to the next step and then runs the pipeline from there.
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

    // Fetch feature to verify state
    const { data: feature, error: fetchError } = await sb
      .from("features")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 })
    }

    // If feature needs attention after escalation approval, we should resume from current step
    // Otherwise, verify it was approved and is ready to advance
    const wasEscalated = feature.attention_type === "error" && !feature.needs_attention
    
    if (feature.needs_attention && !wasEscalated) {
      return NextResponse.json(
        { error: "Feature still needs attention - cannot auto-advance" },
        { status: 400 }
      )
    }

    // Special case: if status is 'done' or 'pr_submitted', no need to advance
    if (feature.status === "done" || feature.status === "pr_submitted") {
      return NextResponse.json(
        { message: "Feature already complete", feature },
        { status: 200 }
      )
    }

    const currentStepId = feature.current_step
    if (!currentStepId) {
      return NextResponse.json(
        { error: "Feature has no current step" },
        { status: 400 }
      )
    }

    // If this was an escalation approval, resume from current step without advancing
    if (wasEscalated) {
      // Just run the pipeline from the current step
      const runPipelineUrl = new URL(`/api/features/${id}/run-pipeline`, req.url)
      
      const response = await fetch(runPipelineUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        return NextResponse.json(
          { error: errorData.error || "Failed to run pipeline" },
          { status: response.status }
        )
      }

      const result = await response.json()
      return NextResponse.json(result, { status: 200 })
    }

    // Advance to next step
    const nextStep = getNextStep(currentStepId as any)
    if (!nextStep) {
      // No next step - mark as done
      await sb.from("features").update({
        status: "done",
        needs_attention: false,
        attention_type: null,
        updated_at: new Date().toISOString(),
      }).eq("id", id)

      const { data: finalFeature } = await sb
        .from("features")
        .select("*")
        .eq("id", id)
        .single()

      return NextResponse.json(
        { message: "Pipeline complete", feature: finalFeature },
        { status: 200 }
      )
    }

    // Update to next step
    await sb.from("features").update({
      current_step: nextStep.id,
      current_agent: nextStep.agent,
      status: calculateStatus(nextStep.id),
      updated_at: new Date().toISOString(),
    }).eq("id", id)

    // Now trigger the run-pipeline endpoint to process from this new step
    const runPipelineUrl = new URL(`/api/features/${id}/run-pipeline`, req.url)
    
    const response = await fetch(runPipelineUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      return NextResponse.json(
        { error: errorData.error || "Failed to run pipeline" },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
