import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import DiffMatchPatch from "diff-match-patch"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase service role key is not configured")
  }
  return createClient(supabaseUrl, supabaseKey)
}

interface DiffOp {
  op: "equal" | "insert" | "delete"
  text: string
}

function computeDiff(oldText: string, newText: string): DiffOp[] {
  const dmp = new DiffMatchPatch()
  const diffs = dmp.diff_main(oldText, newText)
  dmp.diff_cleanupSemantic(diffs)

  return diffs.map(([op, text]) => ({
    op: op === 0 ? "equal" : op === 1 ? "insert" : "delete",
    text,
  }))
}

interface ArtifactLike {
  type?: string
  title?: string
  content?: string
  url?: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; packetId: string }> }
) {
  const { id: featureId, packetId } = await params

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing required environment variables." },
      { status: 503 }
    )
  }

  try {
    const sb = getSupabase()

    // Fetch current packet
    const { data: current, error: currentErr } = await sb
      .from("handoff_packets")
      .select("*")
      .eq("id", packetId)
      .eq("feature_id", featureId)
      .single()

    if (currentErr || !current) {
      return NextResponse.json({ error: "Handoff packet not found" }, { status: 404 })
    }

    if (!current.previous_version_id) {
      return NextResponse.json(
        { error: "This is version 1 — no previous version to diff against" },
        { status: 400 }
      )
    }

    // Fetch previous packet
    const { data: previous, error: prevErr } = await sb
      .from("handoff_packets")
      .select("*")
      .eq("id", current.previous_version_id)
      .single()

    if (prevErr || !previous) {
      return NextResponse.json(
        { error: "Previous version packet not found" },
        { status: 400 }
      )
    }

    // Diff summary
    const summaryDiff = computeDiff(
      previous.output_summary || "",
      current.output_summary || ""
    )

    // Diff artifacts
    const currentArtifacts: ArtifactLike[] = current.output_artifacts || []
    const previousArtifacts: ArtifactLike[] = previous.output_artifacts || []

    const artifactsDiff = currentArtifacts.map((artifact, i) => {
      const prevArtifact = previousArtifacts[i]
      const currentContent = artifact.content || ""
      const prevContent = prevArtifact?.content || ""

      if (!currentContent && !prevContent) {
        return { title: artifact.title || `Artifact ${i + 1}`, contentDiff: null }
      }

      return {
        title: artifact.title || `Artifact ${i + 1}`,
        contentDiff: computeDiff(prevContent, currentContent),
      }
    })

    return NextResponse.json({
      diff: {
        summary: summaryDiff,
        artifacts: artifactsDiff,
      },
      currentVersion: current.version,
      previousVersion: previous.version,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
