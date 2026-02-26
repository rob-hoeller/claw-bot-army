"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Copy } from "lucide-react"
import type { PipelineTerminalProps, TerminalLine } from "./pipeline.types"

// ─── Verdict Color Mapping ───────────────────────────────────────────────────

const VERDICT_COLORS: Record<string, string> = {
  APPROVED: "text-green-400",
  COMPLETE: "text-green-400",
  SHIP: "text-green-400",
  REVISE: "text-yellow-400",
  REJECT: "text-red-400",
}

// ─── Step Agent Mapping ──────────────────────────────────────────────────────

const STEP_AGENT_MAP: Record<string, string> = {
  intake: "HBx",
  spec: "IN1",
  design: "IN5",
  build: "IN2",
  qa: "IN6",
  ship: "HBx",
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PipelineTerminal({
  lines,
  isStreaming,
  filterStepId,
  maxHeightPx = 320,
  onCopy,
}: PipelineTerminalProps) {
  const bodyRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [lines])

  // Filter lines if a step filter is active
  const displayedLines = filterStepId
    ? lines.filter((line) => line.agent === STEP_AGENT_MAP[filterStepId])
    : lines

  const handleCopy = () => {
    const text = displayedLines
      .map((line) => {
        const timestamp = formatTimestamp(line.timestamp)
        const verdict = line.verdict ? ` [${line.verdict}]` : ""
        const main = `${timestamp} ${line.agent} ${line.action}${verdict}`
        const details = line.details.length
          ? "\n" + line.details.map((d) => `  ${d}`).join("\n")
          : ""
        return main + details
      })
      .join("\n")

    navigator.clipboard.writeText(text)
    onCopy?.()
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-800/50">
        <div className="flex items-center gap-2">
          {/* macOS-style dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-white/60 font-mono ml-2">
            pipeline-output.log
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          title="Copy log to clipboard"
          aria-label="Copy pipeline log to clipboard"
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
      </div>

      {/* Terminal Body */}
      <div
        ref={bodyRef}
        className="bg-[#0d1117] p-4 overflow-y-auto font-mono text-xs leading-relaxed"
        style={{ maxHeight: `${maxHeightPx}px` }}
        role="log"
        aria-label="Pipeline execution log"
        aria-live={isStreaming ? "polite" : "off"}
        aria-atomic="false"
      >
        {displayedLines.length === 0 ? (
          <div className="text-white/30 italic">
            {filterStepId
              ? `No events for ${filterStepId} step yet...`
              : "No pipeline events yet..."}
          </div>
        ) : (
          <div className="space-y-1">
            {displayedLines.map((line) => (
              <div key={line.key}>
                {/* Main log line */}
                <div className="flex items-start gap-2">
                  <span className="text-green-400 flex-shrink-0">→</span>
                  <span className="text-white/40 w-12 flex-shrink-0">
                    {formatTimestamp(line.timestamp)}
                  </span>
                  <span className="text-amber-400 flex-shrink-0">
                    [{line.agent}]
                  </span>
                  <span className="text-white/70 flex-1">{line.action}</span>
                  {line.verdict && (
                    <span
                      className={cn(
                        "flex-shrink-0 font-semibold",
                        VERDICT_COLORS[line.verdict] || "text-white/60"
                      )}
                    >
                      {line.verdict}
                    </span>
                  )}
                  {line.revisionLoop !== undefined && line.revisionLoop > 0 && (
                    <span className="text-yellow-400/60 flex-shrink-0 text-[10px]">
                      (rev {line.revisionLoop})
                    </span>
                  )}
                </div>

                {/* Detail lines (issues, notes) */}
                {line.details.length > 0 && (
                  <div className="ml-14 mt-0.5 space-y-0.5">
                    {line.details.map((detail, idx) => (
                      <div
                        key={idx}
                        className="text-yellow-400/60 text-[11px] pl-3 border-l-2 border-yellow-400/20"
                      >
                        {detail}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Blinking cursor for live streaming */}
            {isStreaming && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-green-400">→</span>
                <span className="text-white/40 w-12">
                  {formatTimestamp(new Date().toISOString())}
                </span>
                <span className="text-white/50 animate-pulse">▊</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helper: Format Timestamp ────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso)
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${hours}:${minutes}`
  } catch {
    return "00:00"
  }
}
