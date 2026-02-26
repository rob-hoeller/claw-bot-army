"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ExternalLink, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import type { HumanGateProps } from "./mission.types"
import { cn } from "@/lib/utils"

/**
 * HumanGate
 * 
 * The action component shown when a feature needs human attention:
 * - review: "Preview on Vercel" + "Approve" + "Request Changes"
 * - approve (spec): Shows spec summary + "Approve Plan" + "Revise"
 * - error: Shows error details + "Retry" + "Escalate"
 */
export function HumanGate({
  feature,
  attentionType,
  onApprove,
  onRevise,
  onEscalate,
  className,
}: HumanGateProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRevising, setIsRevising] = useState(false)
  const [showReviseFeedback, setShowReviseFeedback] = useState(false)
  const [reviseFeedback, setReviseFeedback] = useState("")

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await onApprove()
    } finally {
      setIsApproving(false)
    }
  }

  const handleRevise = async () => {
    if (showReviseFeedback && !reviseFeedback.trim()) {
      alert("Please provide feedback for the revision")
      return
    }

    setIsRevising(true)
    try {
      await onRevise(showReviseFeedback ? reviseFeedback : undefined)
      setShowReviseFeedback(false)
      setReviseFeedback("")
    } finally {
      setIsRevising(false)
    }
  }

  const renderContent = () => {
    switch (attentionType) {
      case "review":
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">Ready for Review</h3>
                <p className="text-xs text-white/60">
                  Feature has been built and deployed for your review
                </p>
              </div>
            </div>

            {feature.vercel_preview_url && (
              <a
                href={feature.vercel_preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 mb-4 bg-slate-800 hover:bg-slate-700 rounded border border-white/10 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-white/80">Preview on Vercel</span>
              </a>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleApprove}
                disabled={isApproving || isRevising}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 rounded font-medium text-sm text-white transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {isApproving ? "Approving..." : "Approve & Ship"}
              </button>
              <button
                onClick={() => setShowReviseFeedback(!showReviseFeedback)}
                disabled={isApproving || isRevising}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 rounded font-medium text-sm text-white transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Request Changes
              </button>
            </div>

            {showReviseFeedback && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-3 space-y-2"
              >
                <textarea
                  value={reviseFeedback}
                  onChange={(e) => setReviseFeedback(e.target.value)}
                  placeholder="Describe what needs to be changed..."
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded text-sm text-white placeholder-white/40 resize-none"
                  rows={3}
                />
                <button
                  onClick={handleRevise}
                  disabled={isRevising}
                  className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 rounded font-medium text-sm text-white transition-colors"
                >
                  {isRevising ? "Submitting..." : "Submit Feedback"}
                </button>
              </motion.div>
            )}
          </>
        )

      case "approve":
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">Plan Ready for Approval</h3>
                <p className="text-xs text-white/60">
                  Architect has created a detailed specification
                </p>
              </div>
            </div>

            {feature.feature_spec && (
              <div className="mb-4 p-3 bg-slate-800/50 border border-white/10 rounded max-h-32 overflow-y-auto">
                <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
                  {feature.feature_spec}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleApprove}
                disabled={isApproving || isRevising}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 rounded font-medium text-sm text-white transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {isApproving ? "Approving..." : "Approve Plan"}
              </button>
              <button
                onClick={() => setShowReviseFeedback(!showReviseFeedback)}
                disabled={isApproving || isRevising}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 rounded font-medium text-sm text-white transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Revise
              </button>
            </div>

            {showReviseFeedback && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-3 space-y-2"
              >
                <textarea
                  value={reviseFeedback}
                  onChange={(e) => setReviseFeedback(e.target.value)}
                  placeholder="What should be changed in the plan?"
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded text-sm text-white placeholder-white/40 resize-none"
                  rows={3}
                />
                <button
                  onClick={handleRevise}
                  disabled={isRevising}
                  className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 rounded font-medium text-sm text-white transition-colors"
                >
                  {isRevising ? "Submitting..." : "Submit Revisions"}
                </button>
              </motion.div>
            )}
          </>
        )

      case "error":
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">Error Occurred</h3>
                <p className="text-xs text-white/60">Pipeline encountered an issue</p>
              </div>
            </div>

            {/* @ts-ignore - error_details may not be in type yet */}
            {feature.error_details && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
                <pre className="text-xs text-red-200 font-mono whitespace-pre-wrap">
                  {/* @ts-ignore */}
                  {feature.error_details}
                </pre>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 rounded font-medium text-sm text-white transition-colors"
              >
                {isApproving ? "Retrying..." : "Retry"}
              </button>
              {onEscalate && (
                <button
                  onClick={() => onEscalate()}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded font-medium text-sm text-white transition-colors"
                >
                  Escalate
                </button>
              )}
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-lg border shadow-lg",
        attentionType === "error"
          ? "bg-red-500/10 border-red-500/30"
          : attentionType === "approve"
            ? "bg-purple-500/10 border-purple-500/30"
            : "bg-amber-500/10 border-amber-500/30",
        className
      )}
    >
      {renderContent()}
    </motion.div>
  )
}
