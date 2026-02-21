import { NextRequest, NextResponse } from "next/server"
import { buildAgentSystemPrompt, streamDirectLLM } from "@/lib/llm-direct"

export const maxDuration = 60

const PLANNING_CONTEXT = `
You are helping the user plan a new feature. Guide them through:
1. Problem definition — what problem does this solve?
2. User impact — who benefits and how?
3. Scope — what's in/out?
4. Acceptance criteria — how do we know it's done?
5. Priority assessment

When you have enough information, summarize the feature spec in a structured format
the user can approve. Use markdown with clear sections.
`

interface PlanMessage {
  role: 'user' | 'assistant'
  content: string
}

interface PlanRequestBody {
  messages: PlanMessage[]
  featureContext?: { title?: string; description?: string }
}

export async function POST(req: NextRequest) {
  try {
    const body: PlanRequestBody = await req.json()
    const { messages, featureContext } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 })
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")
    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 })
    }

    // Build system prompt from IN1's Supabase persona + planning context
    let systemPrompt = await buildAgentSystemPrompt('HBx_IN1')
    if (!systemPrompt) {
      systemPrompt = "You are IN1, the Product Architect. You help users plan and structure features."
    }

    systemPrompt += `\n\n---\n# Planning Mode\n${PLANNING_CONTEXT}`

    if (featureContext?.title || featureContext?.description) {
      systemPrompt += `\n\n# Current Feature Context`
      if (featureContext.title) systemPrompt += `\nTitle: ${featureContext.title}`
      if (featureContext.description) systemPrompt += `\nDescription: ${featureContext.description}`
    }

    return await streamDirectLLM({ systemPrompt, messages })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
