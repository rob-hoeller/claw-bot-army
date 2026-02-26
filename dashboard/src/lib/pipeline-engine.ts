import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Pipeline step definition
 */
export type PipelineStepId = "intake" | "spec" | "design" | "build" | "qa" | "ship"

export type FeatureStatus =
  | "planning"
  | "design_review"
  | "in_progress"
  | "qa_review"
  | "review"
  | "approved"
  | "pr_submitted"
  | "done"
  | "cancelled"

export interface PipelineStep {
  id: PipelineStepId
  agent: string
  label: string
  humanGate: boolean
  description: string
}

/**
 * Ordered pipeline steps
 */
export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "intake",
    agent: "HBx",
    label: "Intake & Routing",
    humanGate: false,
    description: "Feature submitted and routed to architect",
  },
  {
    id: "spec",
    agent: "HBx_IN1",
    label: "Specification",
    humanGate: true,
    description: "Architect writes technical spec (requires approval)",
  },
  {
    id: "design",
    agent: "HBx_IN5",
    label: "Design",
    humanGate: false,
    description: "UI/UX design and component planning",
  },
  {
    id: "build",
    agent: "HBx_IN2",
    label: "Build",
    humanGate: false,
    description: "Code implementation and testing",
  },
  {
    id: "qa",
    agent: "HBx_IN6",
    label: "QA",
    humanGate: false,
    description: "Quality assurance and validation (auto-advance or auto-revise)",
  },
  {
    id: "ship",
    agent: "HBx",
    label: "Ship",
    humanGate: true,
    description: "Final review and PR creation (requires approval)",
  },
]

/**
 * Get the next step in the pipeline
 */
export function getNextStep(currentStepId: PipelineStepId): PipelineStep | null {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.id === currentStepId)
  if (currentIndex === -1 || currentIndex === PIPELINE_STEPS.length - 1) {
    return null
  }
  return PIPELINE_STEPS[currentIndex + 1]
}

/**
 * Get the previous build step for revisions
 */
export function getPrevBuildStep(currentStepId: PipelineStepId): PipelineStep | null {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.id === currentStepId)
  if (currentIndex <= 0) return null

  // Return the previous step
  return PIPELINE_STEPS[currentIndex - 1]
}

/**
 * Map step ID to feature status
 */
export function calculateStatus(stepId: PipelineStepId): FeatureStatus {
  const statusMap: Record<PipelineStepId, FeatureStatus> = {
    intake: "planning",
    spec: "design_review",
    design: "design_review",
    build: "in_progress",
    qa: "qa_review",
    ship: "review",
  }
  return statusMap[stepId] || "planning"
}

/**
 * Core state machine: advance a feature through the pipeline
 */
export async function advanceFeature(
  featureId: string,
  verdict: "approve" | "revise" | "reject",
  notes?: string
): Promise<{ success: boolean; feature?: any; error?: string }> {
  try {
    const sb = createClient(supabaseUrl, supabaseKey)

    // Fetch current feature
    const { data: feature, error: fetchError } = await sb
      .from("features")
      .select("*")
      .eq("id", featureId)
      .single()

    if (fetchError || !feature) {
      return { success: false, error: "Feature not found" }
    }

    const currentStepId = feature.current_step || "intake"
    const currentStep = PIPELINE_STEPS.find((s) => s.id === currentStepId)

    if (!currentStep) {
      return { success: false, error: "Invalid current step" }
    }

    let updates: any = {
      updated_at: new Date().toISOString(),
    }

    // Handle verdict logic
    if (verdict === "approve") {
      const nextStep = getNextStep(currentStepId as PipelineStepId)
      if (!nextStep) {
        // End of pipeline - mark as done
        updates.status = "done"
        updates.needs_attention = false
      } else {
        updates.current_step = nextStep.id
        updates.current_agent = nextStep.agent
        updates.status = calculateStatus(nextStep.id)
        updates.needs_attention = nextStep.humanGate
        if (nextStep.humanGate) {
          updates.attention_type = "review"
        } else {
          updates.attention_type = null
        }
      }

      // Append to pipeline_log
      const pipelineLog = feature.pipeline_log || []
      pipelineLog.push({
        step: currentStepId,
        verdict: "approve",
        timestamp: new Date().toISOString(),
        notes: notes || null,
      })
      updates.pipeline_log = pipelineLog
    } else if (verdict === "revise") {
      const prevStep = getPrevBuildStep(currentStepId as PipelineStepId)
      if (!prevStep) {
        return { success: false, error: "Cannot revise from first step" }
      }

      const revisionCount = (feature.revision_count || 0) + 1
      if (revisionCount > 2) {
        // Max revisions exceeded - escalate
        updates.needs_attention = true
        updates.attention_type = "error"
        updates.status = "review"
      } else {
        updates.current_step = prevStep.id
        updates.current_agent = prevStep.agent
        updates.status = calculateStatus(prevStep.id)
        updates.revision_count = revisionCount
        updates.needs_attention = false
        updates.attention_type = null
      }

      // Append to pipeline_log
      const pipelineLog = feature.pipeline_log || []
      pipelineLog.push({
        step: currentStepId,
        verdict: "revise",
        revision_count: revisionCount,
        timestamp: new Date().toISOString(),
        notes: notes || null,
      })
      updates.pipeline_log = pipelineLog
    } else if (verdict === "reject") {
      updates.status = "cancelled"
      updates.needs_attention = true
      updates.attention_type = "error"

      // Append to pipeline_log
      const pipelineLog = feature.pipeline_log || []
      pipelineLog.push({
        step: currentStepId,
        verdict: "reject",
        timestamp: new Date().toISOString(),
        notes: notes || null,
      })
      updates.pipeline_log = pipelineLog
    }

    // Update feature
    const { data: updatedFeature, error: updateError } = await sb
      .from("features")
      .update(updates)
      .eq("id", featureId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, feature: updatedFeature }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: message }
  }
}
