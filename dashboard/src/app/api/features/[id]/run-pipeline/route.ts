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
    // QA verdict is now handled dynamically in runStep based on revision logic
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
    // Vercel deploy and PR creation handled in runShipStep
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
    .slice(0, 50) // Max 50 chars for branch names
}

/**
 * Generate a deterministic hash from a string for reproducible randomness
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Check if QA should find issues based on feature title hash (deterministic)
 * Returns true 20% of the time
 */
function shouldQAFindIssues(featureTitle: string): boolean {
  const hash = simpleHash(featureTitle)
  return (hash % 100) < 20 // 20% chance
}

/**
 * Generate mock issues for QA revision
 */
function generateQAIssues(): string[] {
  return [
    "Missing error state for network failures",
    "Button hover states not aligned with design system"
  ]
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
 * Returns true if step completed successfully, false if needs revision
 */
async function runStep(
  sb: any,
  feature: any,
  stepId: PipelineStepId
): Promise<{ success: boolean; needsRevision: boolean }> {
  const activities = STEP_ACTIVITIES[stepId]
  
  // Run all activities
  for (const activity of activities) {
    await writeActivity(sb, feature.id, stepId, activity, feature)
  }

  // Special handling for QA step - check for revisions
  if (stepId === "qa") {
    const revisionCount = feature.revision_count || 0
    const shouldRevise = shouldQAFindIssues(feature.title)

    if (shouldRevise && revisionCount < 2) {
      // QA found issues, needs revision
      const issues = generateQAIssues()
      
      await writeActivity(sb, feature.id, stepId, {
        type: "decision",
        content: `❌ QA FAILED — Found ${issues.length} issues`,
        delayMs: 1000,
      }, feature)

      for (const issue of issues) {
        await writeActivity(sb, feature.id, stepId, {
          type: "thinking",
          content: `• ${issue}`,
          delayMs: 500,
        }, feature)
      }

      await writeActivity(sb, feature.id, stepId, {
        type: "revision",
        content: "Returning to Build for revision...",
        delayMs: 800,
      }, feature)

      return { success: false, needsRevision: true }
    } else if (shouldRevise && revisionCount >= 2) {
      // Max revisions reached, escalate
      await writeActivity(sb, feature.id, stepId, {
        type: "decision",
        content: "❌ QA FAILED — Found issues after 2 revisions",
        delayMs: 1000,
      }, feature)

      await writeActivity(sb, feature.id, stepId, {
        type: "gate",
        content: "Max revisions reached. Escalating to human review.",
        delayMs: 1000,
      }, feature)

      return { success: false, needsRevision: false }
    } else {
      // QA passed
      await writeActivity(sb, feature.id, stepId, {
        type: "decision",
        content: "✅ QA PASSED — 0 issues found. Ready for final review.",
        delayMs: 1000,
      }, feature)

      await writeActivity(sb, feature.id, stepId, {
        type: "handoff",
        content: "QA complete. Handoff to Ship (HBx).",
        delayMs: 500,
      }, feature)
    }
  }

  return { success: true, needsRevision: false }
}

/**
 * Run ship step with Vercel deploy and PR creation
 */
async function runShipStep(sb: any, feature: any): Promise<void> {
  const stepId = "ship"
  const activities = STEP_ACTIVITIES[stepId]
  
  // Run initial ship activities
  for (const activity of activities) {
    await writeActivity(sb, feature.id, stepId, activity, feature)
  }

  // Generate Vercel preview URL
  const branchSlug = slugify(feature.title)
  const vercelUrl = `https://claw-bot-army-${branchSlug}-heartbeat-v2.vercel.app`

  await writeActivity(sb, feature.id, stepId, {
    type: "thinking",
    content: "Deploying to Vercel...",
    delayMs: 2000,
  }, feature)

  await writeActivity(sb, feature.id, stepId, {
    type: "result",
    content: `Vercel preview deployed: ${vercelUrl}`,
    delayMs: 1000,
  }, feature)

  // Update feature with Vercel URL
  await sb.from("features").update({
    vercel_preview_url: vercelUrl,
    updated_at: new Date().toISOString(),
  }).eq("id", feature.id)

  // Simulate PR creation (ENABLE_REAL_PR_CREATION flag for future)
  const ENABLE_REAL_PR_CREATION = false // TODO: Set to true when ready for real PRs

  if (ENABLE_REAL_PR_CREATION) {
    // Real PR creation would go here using GitHub API
    // For now, this is disabled to avoid cluttering the repo
  }

  // Simulate PR data
  const prNumber = Math.floor(Math.random() * 900) + 100 // Random PR number 100-999
  const prUrl = `https://github.com/rob-hoeller/claw-bot-army/pull/${prNumber}`

  await writeActivity(sb, feature.id, stepId, {
    type: "thinking",
    content: "Creating pull request...",
    delayMs: 1500,
  }, feature)

  await writeActivity(sb, feature.id, stepId, {
    type: "result",
    content: `PR #${prNumber} created: ${feature.title}`,
    delayMs: 1000,
  }, feature)

  // Update feature with PR info
  await sb.from("features").update({
    pr_url: prUrl,
    pr_number: prNumber,
    pr_status: "open",
    branch_name: `feat/${branchSlug}`,
    updated_at: new Date().toISOString(),
  }).eq("id", feature.id)

  // Final gate for human review
  await writeActivity(sb, feature.id, stepId, {
    type: "gate",
    content: "Ready for final review. Awaiting approval to merge PR.",
    delayMs: 500,
  }, feature)
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
      // Fetch latest feature state for revision_count
      const { data: latestFeature } = await sb
        .from("features")
        .select("*")
        .eq("id", id)
        .single()

      // Special handling for ship step
      if (currentStepId === "ship") {
        await runShipStep(sb, latestFeature || feature)

        // Ship always ends at a human gate
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
          notes: `${currentStep.label} completed - awaiting human review`,
        })

        await sb.from("features").update({
          pipeline_log: pipelineLog,
          needs_attention: true,
          attention_type: "review",
          status: calculateStatus(currentStepId as PipelineStepId),
          updated_at: new Date().toISOString(),
        }).eq("id", id)

        break
      }

      // Run activities for the current step
      const { success, needsRevision } = await runStep(sb, latestFeature || feature, currentStepId as PipelineStepId)

      // Update pipeline_log
      const { data: currentFeature } = await sb
        .from("features")
        .select("pipeline_log, revision_count")
        .eq("id", id)
        .single()

      const pipelineLog = currentFeature?.pipeline_log || []
      
      if (needsRevision) {
        // Revision loop - return to build
        pipelineLog.push({
          step: currentStepId,
          verdict: "revision_needed",
          timestamp: new Date().toISOString(),
          notes: "QA found issues, returning to Build",
          revision_loop: (currentFeature?.revision_count || 0) + 1,
        })

        await sb.from("features").update({
          current_step: "build",
          current_agent: "HBx_IN2",
          status: "in_progress",
          revision_count: (currentFeature?.revision_count || 0) + 1,
          pipeline_log: pipelineLog,
          updated_at: new Date().toISOString(),
        }).eq("id", id)

        // Continue loop from build step
        currentStepId = "build"
        currentStep = PIPELINE_STEPS.find((s) => s.id === "build")
        await new Promise((resolve) => setTimeout(resolve, 1000))
        continue
      }

      if (!success) {
        // Max revisions reached, escalate to human
        pipelineLog.push({
          step: currentStepId,
          verdict: "escalated",
          timestamp: new Date().toISOString(),
          notes: "Max revisions reached, needs human intervention",
        })

        await sb.from("features").update({
          pipeline_log: pipelineLog,
          needs_attention: true,
          attention_type: "error",
          status: "qa_review",
          updated_at: new Date().toISOString(),
        }).eq("id", id)

        break
      }

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
          attention_type: currentStepId === "spec" ? "approve" : "review",
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
