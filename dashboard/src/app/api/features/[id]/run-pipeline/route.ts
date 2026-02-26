import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PIPELINE_STEPS, getNextStep, calculateStatus, type PipelineStepId } from "@/lib/pipeline-engine"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Activity event templates for each pipeline step
 */
const STEP_ACTIVITIES: Record<PipelineStepId, Array<{ type: string; content: string; delayMs: number }>> = {
  intake: [
    { type: "thinking", content: "Classifying feature complexity...", delayMs: 800 },
    { type: "thinking", content: "Analyzing priority and dependencies...", delayMs: 1200 },
    { type: "decision", content: "Priority: {priority}, Complexity: {complexity}", delayMs: 1000 },
    { type: "thinking", content: "Routing to Product Architect (IN1)...", delayMs: 700 },
    { type: "handoff", content: "Intake complete. Handoff packet prepared for IN1.", delayMs: 500 },
  ],
  spec: [
    { type: "thinking", content: "Analyzing requirements and business context...", delayMs: 1500 },
    { type: "thinking", content: "Reviewing existing codebase for related patterns...", delayMs: 1800 },
    { type: "file_edit", content: "Scanning `src/components/` for reusable patterns...", delayMs: 1200 },
    { type: "thinking", content: "Drafting technical specification...", delayMs: 2000 },
    { type: "thinking", content: "Defining acceptance criteria...", delayMs: 1400 },
    { type: "decision", content: "Estimated effort: {effort} hours. Dependencies: {dependencies}.", delayMs: 1000 },
    { type: "gate", content: "Spec complete. Awaiting human approval.", delayMs: 500 },
  ],
  design: [
    { type: "thinking", content: "Creating component hierarchy and data flow...", delayMs: 1600 },
    { type: "thinking", content: "Selecting color palette and spacing tokens...", delayMs: 1300 },
    { type: "file_create", content: "Drafting `{component_name}.tsx` structure...", delayMs: 1200 },
    { type: "thinking", content: "Designing responsive breakpoints (mobile, tablet, desktop)...", delayMs: 1700 },
    { type: "thinking", content: "Planning loading, error, and empty states...", delayMs: 1400 },
    { type: "decision", content: "Design approach: {approach}. Using shadcn/ui primitives.", delayMs: 1000 },
    { type: "handoff", content: "Design mockup complete. Handoff to Build (IN2).", delayMs: 600 },
  ],
  build: [
    { type: "thinking", content: "Setting up component scaffolding...", delayMs: 1200 },
    { type: "file_create", content: "Creating `src/components/{component_path}.tsx`...", delayMs: 1500 },
    { type: "thinking", content: "Implementing state management and event handlers...", delayMs: 1800 },
    { type: "file_edit", content: "Adding error handling and loading states...", delayMs: 1600 },
    { type: "thinking", content: "Wiring up API integrations...", delayMs: 1400 },
    { type: "command", content: "Running `npx tsc --noEmit`...", delayMs: 2000 },
    { type: "result", content: "✅ Typecheck passed — 0 errors", delayMs: 800 },
    { type: "handoff", content: "Build complete. Handoff to QA (IN6).", delayMs: 500 },
  ],
  qa: [
    { type: "thinking", content: "Running automated test suite...", delayMs: 2000 },
    { type: "command", content: "Running `npm run lint`...", delayMs: 1500 },
    { type: "result", content: "✅ Lint passed — 0 warnings", delayMs: 700 },
    { type: "thinking", content: "Checking accessibility compliance (WCAG AA)...", delayMs: 1600 },
    { type: "thinking", content: "Verifying responsive layout on mobile/tablet/desktop...", delayMs: 1800 },
    { type: "thinking", content: "Testing loading, error, and empty states...", delayMs: 1400 },
    { type: "decision", content: "QA PASSED — 0 issues found. Ready for final review.", delayMs: 1000 },
    { type: "handoff", content: "QA complete. Handoff to Ship (HBx).", delayMs: 500 },
  ],
  ship: [
    { type: "thinking", content: "Creating feature branch...", delayMs: 1200 },
    { type: "command", content: "Running `git checkout -b feat/{feature_slug}`...", delayMs: 1000 },
    { type: "result", content: "✅ Branch created", delayMs: 600 },
    { type: "thinking", content: "Staging changes...", delayMs: 1000 },
    { type: "command", content: "Running `git add .`...", delayMs: 800 },
    { type: "thinking", content: "Committing with structured message...", delayMs: 1200 },
    { type: "command", content: "Running `git commit -m \"feat: {title}\"`...", delayMs: 1000 },
    { type: "result", content: "✅ Committed successfully", delayMs: 600 },
    { type: "thinking", content: "Pushing to origin...", delayMs: 1400 },
    { type: "command", content: "Running `git push origin feat/{feature_slug}`...", delayMs: 1500 },
    { type: "result", content: "✅ Pushed to remote", delayMs: 700 },
    { type: "thinking", content: "Preparing pull request...", delayMs: 1000 },
    { type: "gate", content: "Ready for final review. Awaiting approval to create PR.", delayMs: 500 },
  ],
}

/**
 * Helper to replace template variables in activity content
 */
function interpolate(content: string, feature: any): string {
  return content
    .replace("{priority}", feature.priority || "medium")
    .replace("{complexity}", calculateComplexity(feature))
    .replace("{effort}", estimateEffort(feature))
    .replace("{dependencies}", "none")
    .replace("{component_name}", deriveComponentName(feature.title))
    .replace("{component_path}", deriveComponentPath(feature.title))
    .replace("{approach}", "Component-driven with Tailwind v4 + shadcn/ui")
    .replace("{title}", feature.title)
    .replace("{feature_slug}", slugify(feature.title))
}

function calculateComplexity(feature: any): string {
  const titleLen = (feature.title || "").length
  if (titleLen < 30) return "S"
  if (titleLen < 60) return "M"
  if (titleLen < 90) return "L"
  return "XL"
}

function estimateEffort(feature: any): string {
  const complexity = calculateComplexity(feature)
  const effortMap: Record<string, string> = { S: "2-4", M: "4-8", L: "8-16", XL: "16+" }
  return effortMap[complexity] || "4-8"
}

function deriveComponentName(title: string): string {
  const words = title.split(" ").filter(Boolean)
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("")
    .replace(/[^a-zA-Z0-9]/g, "")
}

function deriveComponentPath(title: string): string {
  const componentName = deriveComponentName(title)
  return `features/${componentName}`
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * Helper to write a single activity event with delay
 */
async function writeActivity(
  sb: any,
  featureId: string,
  stepId: PipelineStepId,
  event: { type: string; content: string; delayMs: number },
  feature: any
) {
  await new Promise((resolve) => setTimeout(resolve, event.delayMs))

  const agentId = PIPELINE_STEPS.find((s) => s.id === stepId)?.agent || "system"
  const content = interpolate(event.content, feature)

  const { error } = await sb.from("agent_activity").insert({
    feature_id: featureId,
    agent_id: agentId,
    step_id: stepId,
    event_type: event.type,
    action_type: event.type, // Legacy column - use same value as event_type
    content,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  })

  if (error) {
    console.error("Failed to write activity:", error)
  }
}

/**
 * Run all activities for a single pipeline step
 */
async function runStep(sb: any, feature: any, stepId: PipelineStepId): Promise<void> {
  const activities = STEP_ACTIVITIES[stepId]
  for (const activity of activities) {
    await writeActivity(sb, feature.id, stepId, activity, feature)
  }
}

/**
 * POST /api/features/[id]/run-pipeline
 * Drives a feature through the pipeline, running all automated steps until hitting a gate
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

    let currentStepId = feature.current_step || "intake"
    let currentStep = PIPELINE_STEPS.find((s) => s.id === currentStepId)

    if (!currentStep) {
      return NextResponse.json({ error: "Invalid current step" }, { status: 400 })
    }

    // If we're at a human gate and needs_attention is already true, don't re-run
    if (currentStep.humanGate && feature.needs_attention) {
      return NextResponse.json(
        { message: "Already at human gate, awaiting review", feature },
        { status: 200 }
      )
    }

    // Loop through steps until we hit a human gate
    while (currentStep) {
      // Run activities for the current step
      await runStep(sb, feature, currentStepId as PipelineStepId)

      // Update pipeline_log
      const { data: currentFeature } = await sb
        .from("features")
        .select("pipeline_log")
        .eq("id", id)
        .single()

      const pipelineLog = currentFeature?.pipeline_log || []
      pipelineLog.push({
        step: currentStepId,
        verdict: "complete",
        timestamp: new Date().toISOString(),
        notes: `${currentStep.label} completed`,
      })

      // If this is a human gate, stop here
      if (currentStep.humanGate) {
        await sb.from("features").update({
          pipeline_log: pipelineLog,
          needs_attention: true,
          attention_type: "review",
          status: calculateStatus(currentStepId as PipelineStepId),
          updated_at: new Date().toISOString(),
        }).eq("id", id)

        break
      }

      // Otherwise, advance to next step
      const nextStep = getNextStep(currentStepId as PipelineStepId)
      if (!nextStep) {
        // End of pipeline
        await sb.from("features").update({
          pipeline_log: pipelineLog,
          status: "done",
          needs_attention: false,
          attention_type: null,
          updated_at: new Date().toISOString(),
        }).eq("id", id)

        break
      }

      // Update to next step
      await sb.from("features").update({
        current_step: nextStep.id,
        current_agent: nextStep.agent,
        status: calculateStatus(nextStep.id),
        pipeline_log: pipelineLog,
        updated_at: new Date().toISOString(),
      }).eq("id", id)

      // Continue loop with next step
      currentStepId = nextStep.id
      currentStep = nextStep

      // Small delay before next step
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Fetch final feature state
    const { data: finalFeature, error: finalError } = await sb
      .from("features")
      .select("*")
      .eq("id", id)
      .single()

    if (finalError) {
      return NextResponse.json({ error: finalError.message }, { status: 500 })
    }

    return NextResponse.json({ feature: finalFeature }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
