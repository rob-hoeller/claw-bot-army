"use client"

import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import type { ActivityEventProps } from "./mission.types"
import { cn } from "@/lib/utils"

/**
 * ActivityEvent
 * 
 * Renders individual activity stream events with distinct visuals per type:
 * - thinking: 💭 italic dimmed text, subtle pulse animation
 * - file_edit: 📝 monospace filename with line range
 * - file_create: ✨ green accent, new file icon
 * - command: ⚡ terminal-style monospace block
 * - result: ✅/❌ badge with pass/fail styling
 * - decision: 🧠 highlighted card with reasoning
 * - handoff: 📦 amber banner, "Handing off to [Agent]"
 * - gate: 🔔 red pulse, action buttons placeholder
 * - revision: 🔄 yellow banner, revision count
 */
export function ActivityEvent({ event, agentName, className }: ActivityEventProps) {
  const relativeTime = formatDistanceToNow(new Date(event.created_at), {
    addSuffix: true,
  })

  const renderContent = () => {
    switch (event.event_type) {
      case "thinking":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-start gap-2"
          >
            <span className="text-lg">💭</span>
            <p className="italic text-sm text-white/50 leading-relaxed">{event.content}</p>
          </motion.div>
        )

      case "file_edit":
        return (
          <div className="flex items-start gap-2">
            <span className="text-lg">📝</span>
            <div className="flex-1 space-y-1">
              <p className="text-sm text-white/80">{event.content}</p>
              {event.metadata.filePath ? (
                <code className="text-xs font-mono text-cyan-400 bg-slate-800/50 px-2 py-1 rounded block">
                  {String(event.metadata.filePath)}
                  {event.metadata.lineRange ? ` (L${String(event.metadata.lineRange)})` : ""}
                </code>
              ) : null}
            </div>
          </div>
        )

      case "file_create":
        return (
          <div className="flex items-start gap-2">
            <span className="text-lg">✨</span>
            <div className="flex-1 space-y-1">
              <p className="text-sm text-green-400 font-medium">{event.content}</p>
              {event.metadata.filePath ? (
                <code className="text-xs font-mono text-green-500 bg-slate-800/50 px-2 py-1 rounded block">
                  {String(event.metadata.filePath)}
                </code>
              ) : null}
            </div>
          </div>
        )

      case "command":
        return (
          <div className="flex items-start gap-2">
            <span className="text-lg">⚡</span>
            <div className="flex-1 space-y-1">
              <p className="text-sm text-white/70">{event.content}</p>
              {event.metadata.command ? (
                <pre className="text-xs font-mono text-amber-400 bg-slate-900 p-2 rounded border border-white/10 overflow-x-auto block">
                  {`$ ${String(event.metadata.command)}`}
                </pre>
              ) : null}
            </div>
          </div>
        )

      case "result":
        const isPassing = event.metadata.success === true || event.content.includes("pass")
        return (
          <div className="flex items-start gap-2">
            <span className="text-lg">{isPassing ? "✅" : "❌"}</span>
            <div className="flex-1 space-y-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  isPassing ? "text-green-400" : "text-red-400"
                )}
              >
                {event.content}
              </p>
              {event.metadata.output ? (
                <pre className="text-xs font-mono text-white/60 bg-slate-900 p-2 rounded border border-white/10 overflow-x-auto max-h-32 block">
                  {String(event.metadata.output)}
                </pre>
              ) : null}
            </div>
          </div>
        )

      case "decision":
        return (
          <div className="flex items-start gap-2">
            <span className="text-lg">🧠</span>
            <div className="flex-1 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
              <p className="text-sm text-purple-200 font-medium mb-1">Decision</p>
              <p className="text-sm text-white/80 leading-relaxed">{event.content}</p>
              {event.metadata.reasoning ? (
                <p className="text-xs text-white/50 mt-2 leading-relaxed block">
                  {String(event.metadata.reasoning)}
                </p>
              ) : null}
            </div>
          </div>
        )

      case "handoff":
        return (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded">
            <div className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              <div className="flex-1">
                <p className="text-sm text-amber-200 font-medium">{event.content}</p>
                {event.metadata.toAgent ? (
                  <p className="text-xs text-white/50 mt-1 block">
                    {`→ Handing off to ${String(event.metadata.toAgent)}`}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )

      case "gate":
        return (
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="p-3 bg-red-500/10 border border-red-500/30 rounded"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <div className="flex-1">
                <p className="text-sm text-red-200 font-medium">{event.content}</p>
                {event.metadata.action ? (
                  <p className="text-xs text-white/50 mt-1 block">
                    {`Action required: ${String(event.metadata.action)}`}
                  </p>
                ) : null}
              </div>
            </div>
          </motion.div>
        )

      case "revision":
        return (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔄</span>
              <div className="flex-1">
                <p className="text-sm text-yellow-200 font-medium">{event.content}</p>
                {event.metadata.revisionCount ? (
                  <p className="text-xs text-white/50 mt-1 block">
                    {`Revision #${String(event.metadata.revisionCount)}`}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="flex items-start gap-2">
            <span className="text-lg">•</span>
            <p className="text-sm text-white/70">{event.content}</p>
          </div>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("py-3 px-4 border-b border-white/5", className)}
    >
      {/* Header: agent + timestamp */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
            {event.agent_id.slice(0, 2)}
          </div>
          <span className="text-xs font-medium text-white/70">
            {agentName || event.agent_id}
          </span>
        </div>
        <time className="text-xs text-white/40">{relativeTime}</time>
      </div>

      {/* Event content */}
      {renderContent()}
    </motion.div>
  )
}
