import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase service role key is not configured")
  }
  return createClient(supabaseUrl, supabaseKey)
}

const VALID_PHASES = new Set(["planning", "design_review", "in_progress", "qa_review", "review", "approved", "pr_submitted", "done"])

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const phase = req.nextUrl.searchParams.get("phase")

  if (!phase || !VALID_PHASES.has(phase)) {
    return NextResponse.json(
      { error: "Invalid or missing phase query param." },
      { status: 400 }
    )
  }

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing required environment variables." },
      { status: 503 }
    )
  }

  try {
    const sb = getSupabase()
    const { data, error } = await sb
      .from("phase_chat_messages")
      .select("*")
      .eq("feature_id", id)
      .eq("phase", phase)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: data ?? [] })
  } catch (err) {
    console.error("[API] Phase chat GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: featureId } = await params

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing required environment variables." },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()
    const { phase, content, author_type, author_id, author_name, mentions, attachments } = body

    if (!phase || !VALID_PHASES.has(phase)) {
      return NextResponse.json(
        { error: "Invalid phase." },
        { status: 400 }
      )
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 })
    }

    if (!author_type || !author_id || !author_name) {
      return NextResponse.json(
        { error: "author_type, author_id, and author_name are required" },
        { status: 400 }
      )
    }

    const sb = getSupabase()

    const mentionsArray = Array.isArray(mentions) ? mentions : []

    const { data, error } = await sb
      .from("phase_chat_messages")
      .insert({
        feature_id: featureId,
        phase,
        author_type,
        author_id,
        author_name,
        content: content.trim(),
        mentions: mentionsArray,
        attachments: Array.isArray(attachments) ? attachments : [],
      })
      .select()
      .single()

    if (error) {
      console.error("[API] Phase chat POST error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error("[API] Phase chat POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
