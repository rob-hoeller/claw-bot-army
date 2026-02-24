"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"

interface DiffOp {
  op: "equal" | "insert" | "delete"
  text: string
}

interface ArtifactDiff {
  title: string
  contentDiff: DiffOp[] | null
}

interface DiffData {
  diff: {
    summary: DiffOp[]
    artifacts: ArtifactDiff[]
  }
  currentVersion: number
  previousVersion: number
}

function DiffSpan({ segments }: { segments: DiffOp[] }) {
  return (
    <span className="text-[11px] leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.op === "equal") {
          return <span key={i} className="text-white/70">{seg.text}</span>
        }
        if (seg.op === "insert") {
          return (
            <span key={i} className="bg-green-500/20 text-green-300 rounded-sm px-0.5">
              {seg.text}
            </span>
          )
        }
        return (
          <span key={i} className="bg-red-500/20 text-red-300 line-through rounded-sm px-0.5">
            {seg.text}
          </span>
        )
      })}
    </span>
  )
}

interface DiffViewProps {
  featureId: string
  packetId: string
}

export function DiffView({ featureId, packetId }: DiffViewProps) {
  const [data, setData] = useState<DiffData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/features/${featureId}/handoff-packets/${packetId}/diff`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [featureId, packetId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-16">
        <Loader2 className="h-3 w-3 text-purple-400 animate-spin" />
        <span className="text-[10px] text-white/30 ml-2">Loading diff...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
        <AlertCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
        <span className="text-[10px] text-red-300">{error}</span>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-3">
      <div className="text-[9px] text-white/30 uppercase tracking-wider">
        Changes from v{data.previousVersion} → v{data.currentVersion}
      </div>

      {/* Summary diff */}
      {data.diff.summary.some((s) => s.op !== "equal") && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">
            Summary
          </div>
          <div className="p-2 rounded bg-white/[0.02] border border-white/5">
            <DiffSpan segments={data.diff.summary} />
          </div>
        </div>
      )}

      {/* Artifacts diff */}
      {data.diff.artifacts.length > 0 && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">
            Artifacts
          </div>
          <div className="space-y-2">
            {data.diff.artifacts.map((art, i) => (
              <div key={i} className="p-2 rounded bg-white/[0.02] border border-white/5">
                <div className="text-[10px] text-white/50 mb-1">{art.title}</div>
                {art.contentDiff ? (
                  <DiffSpan segments={art.contentDiff} />
                ) : (
                  <span className="text-[10px] text-white/25 italic">
                    No text content to diff
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No changes */}
      {!data.diff.summary.some((s) => s.op !== "equal") &&
        data.diff.artifacts.every((a) => !a.contentDiff || a.contentDiff.every((s) => s.op === "equal")) && (
          <div className="text-[10px] text-white/30 italic text-center py-4">
            No differences found between versions.
          </div>
        )}
    </div>
  )
}
