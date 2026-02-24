import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json([], { status: 200 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from("handoff_packets")
    .select("*")
    .eq("feature_id", id)
    .order("phase", { ascending: true })
    .order("version", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sort by pipeline phase order
  const phaseOrder: Record<string, number> = {
    planning: 1,
    design_review: 2,
    in_progress: 3,
    qa_review: 4,
    review: 5,
    approved: 6,
    pr_submitted: 7,
    done: 8,
  }

  const sorted = (data || []).sort((a, b) => {
    const orderDiff = (phaseOrder[a.phase] || 99) - (phaseOrder[b.phase] || 99)
    if (orderDiff !== 0) return orderDiff
    return a.version - b.version
  })

  return NextResponse.json(sorted)
}
