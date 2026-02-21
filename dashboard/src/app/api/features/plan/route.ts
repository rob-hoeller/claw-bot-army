import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 })
    }

    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === "user")
    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 })
    }

    // Try to extract structured data from the conversation
    const content = lastUserMessage.content.toLowerCase()
    const extracted: Record<string, unknown> = {}

    // Simple keyword-based extraction (works without LLM)
    if (content.includes("urgent") || content.includes("asap")) {
      extracted.priority = "urgent"
    } else if (content.includes("high priority") || content.includes("important")) {
      extracted.priority = "high"
    }

    // Extract potential labels
    const labelKeywords = ["ui", "api", "core", "infrastructure", "sales", "support", "innovation", "bug", "security"]
    const foundLabels = labelKeywords.filter(l => content.includes(l))
    if (foundLabels.length > 0) extracted.labels = foundLabels

    // Generate a helpful response
    const messageCount = messages.filter((m: { role: string }) => m.role === "user").length

    let responseMessage: string
    if (messageCount === 1) {
      responseMessage = `Got it! That sounds like a solid feature idea.\n\nA few questions to help refine this:\n1. **Who is this for?** (which users or agents)\n2. **What's the priority?** (low/medium/high/urgent)\n3. **Any specific acceptance criteria?**\n\nOr if you're ready, switch to the **Form** tab to create it now.`
    } else if (messageCount === 2) {
      responseMessage = `Great details! I'd suggest:\n- Setting clear acceptance criteria\n- Identifying which agent should own the build\n- Defining the scope boundaries\n\nWhen you're ready, switch to the **Form** tab — I've pre-filled what I could from our conversation.`
    } else {
      responseMessage = `I think we have enough context. Switch to the **Form** tab to create this feature. I've extracted what I could from our chat.`
    }

    return NextResponse.json({
      message: responseMessage,
      extracted: Object.keys(extracted).length > 0 ? extracted : undefined,
    })
  } catch (err) {
    console.error("[API] Plan error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
