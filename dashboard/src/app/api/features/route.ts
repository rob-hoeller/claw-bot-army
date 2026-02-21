import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const VALID_STATUSES = [
  "planning",
  "design_review",
  "in_progress",
  "qa_review",
  "review",
  "approved",
  "pr_submitted",
  "done",
  "cancelled",
]

const VALID_PRIORITIES = ["low", "medium", "high", "urgent"]

type FeatureInsert = {
  title: string
  description?: string | null
  priority?: "low" | "medium" | "high" | "urgent"
  status?: string
  assigned_to?: string | null
  requested_by?: string | null
  labels?: string[] | null
  feature_spec?: string | null
  design_spec?: string | null
  acceptance_criteria?: string | null
}

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
      { status: 500 }
    )
  }

  try {
    const body = (await req.json()) as FeatureInsert

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      )
    }

    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { error: "Invalid priority" },
        { status: 400 }
      )
    }

    const payload: FeatureInsert = {
      title: body.title.trim(),
      description: body.description ?? null,
      priority: body.priority ?? "medium",
      status: body.status ?? "planning",
      assigned_to: body.assigned_to ?? null,
      requested_by: body.requested_by ?? null,
      labels: body.labels ?? null,
      feature_spec: body.feature_spec ?? null,
      design_spec: body.design_spec ?? null,
      acceptance_criteria: body.acceptance_criteria ?? null,
    }

    const sb = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await sb
      .from("features")
      .insert(payload)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feature: data })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
