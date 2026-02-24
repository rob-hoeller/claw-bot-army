import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

interface TitleMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages } = body as { messages: TitleMessage[] }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
    const useAnthropic = !process.env.OPENAI_API_KEY && !!process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "No LLM API key configured" }, { status: 503 })
    }

    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n')

    const TITLE_SYSTEM_PROMPT = "You are a title generator. Given a feature planning conversation, output exactly one short title (3-8 words). Rules: NO quotes, NO punctuation at the end, NO explanation, NO preamble. Just the title words. Example input: \"User wants to add dark mode\" → Example output: Automatic Dark Mode Detection"

    // Post-process LLM title output to strip common artifacts
    function cleanTitle(raw: string): string {
      let t = raw.trim()
      // Strip leading/trailing quotes
      t = t.replace(/^["']+|["']+$/g, '')
      // Strip leading prefixes like "Title: " or "Feature: "
      t = t.replace(/^(Title|Feature):\s*/i, '')
      // Strip trailing periods
      t = t.replace(/\.+$/, '')
      t = t.trim()
      // Truncate at last word boundary under 60 chars
      if (t.length > 60) {
        const truncated = t.slice(0, 60)
        const lastSpace = truncated.lastIndexOf(' ')
        t = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated
      }
      return t
    }

    if (useAnthropic) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 60,
          system: TITLE_SYSTEM_PROMPT,
          messages: [{ role: "user", content: conversationText }],
        }),
      })
      if (!res.ok) {
        return NextResponse.json({ error: "LLM request failed" }, { status: 502 })
      }
      const data = await res.json()
      const title = cleanTitle(data.content?.[0]?.text || "")
      return NextResponse.json({ title })
    }

    // OpenAI path
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 60,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: TITLE_SYSTEM_PROMPT,
          },
          { role: "user", content: conversationText },
        ],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: "LLM request failed" }, { status: 502 })
    }

    const data = await res.json()
    const title = cleanTitle(data.choices?.[0]?.message?.content || "")
    return NextResponse.json({ title })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
